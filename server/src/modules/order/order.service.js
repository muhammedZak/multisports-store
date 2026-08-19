import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import { Product } from '../catalog/product.model.js';
import { Coupon } from '../coupon/coupon.model.js';

import { INVENTORY_ADJUSTMENT_REASONS } from '../inventory/inventory.constants.js';

import { Inventory } from '../inventory/inventory.model.js';

import { InventoryAdjustment } from '../inventory/inventoryAdjustment.model.js';

import { Payment, PAYMENT_STATUSES } from '../payment/payment.model.js';

import { Order, ORDER_STATUSES } from './order.model.js';

function toAdminOrderCustomerResource(customer) {
  if (!customer?._id) {
    return null;
  }

  return {
    id: customer._id.toString(),

    name: customer.name,

    email: customer.email,

    phone: customer.phone ?? null,
  };
}

const ADMIN_ORDER_ALLOWED_NEXT_STATUSES = Object.freeze({
  [ORDER_STATUSES.PLACED]: Object.freeze([
    ORDER_STATUSES.CONFIRMED,
    ORDER_STATUSES.CANCELLED,
  ]),

  [ORDER_STATUSES.CONFIRMED]: Object.freeze([
    ORDER_STATUSES.PROCESSING,
    ORDER_STATUSES.CANCELLED,
  ]),

  [ORDER_STATUSES.PROCESSING]: Object.freeze([ORDER_STATUSES.SHIPPED]),

  [ORDER_STATUSES.SHIPPED]: Object.freeze([ORDER_STATUSES.DELIVERED]),

  [ORDER_STATUSES.DELIVERED]: Object.freeze([]),

  [ORDER_STATUSES.CANCELLED]: Object.freeze([]),
});

function getAdminOrderAllowedNextStatuses(orderStatus) {
  return [...(ADMIN_ORDER_ALLOWED_NEXT_STATUSES[orderStatus] ?? [])];
}

function toAdminOrderListResource(order) {
  return {
    id: order._id.toString(),

    orderNumber: order.orderNumber,

    placedAt: order.placedAt,

    orderStatus: order.orderStatus,

    itemCount: getOrderItemCount(order.items),

    customer: toAdminOrderCustomerResource(order.customerId),

    payment: toCustomerOrderListPaymentResource(order.paymentId),

    pricing: {
      totalAmount: order.totalAmount,
    },
  };
}

function toAdminOrderDetailResource(order) {
  return {
    id: order._id.toString(),

    orderNumber: order.orderNumber,

    orderStatus: order.orderStatus,

    placedAt: order.placedAt,

    cancelledAt: order.cancelledAt ?? null,

    customer: toAdminOrderCustomerResource(order.customerId),

    items: order.items.map(toCustomerOrderItemResource),

    shippingAddress: {
      ...order.shippingAddress,
    },

    coupon: toCustomerOrderCouponResource(order.coupon),

    pricing: {
      subtotal: order.subtotal,

      discountAmount: order.discountAmount,

      totalAmount: order.totalAmount,
    },

    payment: toCustomerOrderDetailPaymentResource(order.paymentId),

    allowedNextStatuses: getAdminOrderAllowedNextStatuses(order.orderStatus),
  };
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function throwAdminOrderNotFound() {
  throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
}

function throwCustomerOrderNotCancellable() {
  throw new AppError(
    409,
    'ORDER_NOT_CANCELLABLE',
    'Only a placed Order can be cancelled by the Customer.',
  );
}

function getInventoryCancellationFilter(item) {
  const filter = {
    productId: item.productId,
  };

  if (item.variantId) {
    filter.variantId = item.variantId;
  } else {
    /*
     * Existing simple Product convention:
     * variantId is omitted rather than null.
     */
    filter.variantId = {
      $exists: false,
    };
  }

  return filter;
}

async function restoreInventoryForCancelledOrderItem({
  item,
  orderId,
  session,
}) {
  const updatedInventory = await Inventory.findOneAndUpdate(
    getInventoryCancellationFilter(item),

    {
      $inc: {
        quantity: item.quantity,
      },
    },

    {
      session,
      returnDocument: 'after',
    },
  )
    .select('_id quantity')
    .lean();

  /*
   * A placed Order previously decremented this Inventory position.
   *
   * If that Inventory position is now missing, this is corrupted
   * commerce state. Throwing aborts the entire cancellation
   * transaction rather than cancelling without restoring stock.
   */
  if (!updatedInventory) {
    throw new Error(
      'Order cancellation could not restore a required Inventory position.',
    );
  }

  const newQuantity = updatedInventory.quantity;

  const previousQuantity = newQuantity - item.quantity;

  return {
    inventoryId: updatedInventory._id,

    reason: INVENTORY_ADJUSTMENT_REASONS.ORDER_CANCELLATION,

    quantityChange: item.quantity,

    previousQuantity,

    newQuantity,

    sourceType: 'order',

    sourceId: orderId,
  };
}

function throwPaymentNotFound() {
  throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
}

function throwOrderFinalizationFailed(
  message = 'Payment succeeded, but the Order could not be finalized safely.',
) {
  throw new AppError(409, 'ORDER_FINALIZATION_FAILED', message);
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

function sameObjectId(left, right) {
  if (!left || !right) {
    return false;
  }

  return left.toString() === right.toString();
}

function getSnapshotLineIdentity(item) {
  return `${item.productId.toString()}:${
    item.variantId?.toString() ?? 'simple'
  }`;
}

function assertUniqueSnapshotLines(items) {
  const identities = new Set();

  for (const item of items) {
    const identity = getSnapshotLineIdentity(item);

    if (identities.has(identity)) {
      throwOrderFinalizationFailed(
        'The approved Checkout snapshot contains duplicate purchasable items.',
      );
    }

    identities.add(identity);
  }
}

async function assertSnapshotItemPurchasable(item, session) {
  const product = await Product.findById(item.productId)
    .select('_id variants isActive')
    .session(session)
    .lean();

  if (!product || !product.isActive) {
    throwOrderFinalizationFailed(
      'A paid Product is no longer available for Order placement.',
    );
  }

  const variants = Array.isArray(product.variants) ? product.variants : [];

  /*
   * Simple Product.
   */
  if (!item.variantId) {
    if (variants.length > 0) {
      throwOrderFinalizationFailed(
        'A paid Cart line no longer matches the Product variant structure.',
      );
    }

    return;
  }

  /*
   * Snapshot says Variant Product,
   * but the live Product is now simple.
   */
  if (variants.length === 0) {
    throwOrderFinalizationFailed(
      'A paid Variant no longer matches the Product variant structure.',
    );
  }

  const variant = variants.find((candidate) =>
    sameObjectId(candidate._id, item.variantId),
  );

  if (!variant || !variant.isActive) {
    throwOrderFinalizationFailed(
      'A paid Product variant is no longer available for Order placement.',
    );
  }
}

function getInventoryPurchaseFilter(item) {
  const filter = {
    productId: item.productId,

    /*
     * CRITICAL:
     *
     * Stock validation is part of the write.
     *
     * We never:
     *
     * read quantity
     * → compare
     * → save
     */
    quantity: {
      $gte: item.quantity,
    },
  };

  if (item.variantId) {
    filter.variantId = item.variantId;
  } else {
    /*
     * Existing Inventory convention:
     * simple Product Inventory omits variantId.
     */
    filter.variantId = {
      $exists: false,
    };
  }

  return filter;
}

async function decrementInventoryForOrderItem({ item, orderId, session }) {
  /*
   * Product / Variant must still be purchasable.
   *
   * Current Product PRICE is deliberately not
   * recalculated here because the Customer has
   * already paid the immutable Payment snapshot.
   */
  await assertSnapshotItemPurchasable(item, session);

  const updatedInventory = await Inventory.findOneAndUpdate(
    getInventoryPurchaseFilter(item),

    {
      $inc: {
        quantity: -item.quantity,
      },
    },

    {
      session,
      returnDocument: 'after',
    },
  )
    .select('_id quantity')
    .lean();

  if (!updatedInventory) {
    throwOrderFinalizationFailed(
      'A paid item no longer has enough stock for Order placement.',
    );
  }

  /*
   * updatedInventory is AFTER decrement.
   *
   * Example:
   *
   * before = 10
   * purchase = 3
   * after = 7
   *
   * previous = 7 + 3 = 10
   */
  const previousQuantity = updatedInventory.quantity + item.quantity;

  return {
    inventoryId: updatedInventory._id,

    reason: INVENTORY_ADJUSTMENT_REASONS.ORDER_PURCHASE,

    quantityChange: -item.quantity,

    previousQuantity,

    newQuantity: updatedInventory.quantity,

    /*
     * System source identity.
     *
     * Task 8.1 already created the
     * unique idempotency index for this.
     */
    sourceType: 'order',

    sourceId: orderId,
  };
}

async function consumeCheckoutCoupon({ checkoutSnapshot, session, now }) {
  if (!checkoutSnapshot.coupon) {
    return;
  }

  const couponId = checkoutSnapshot.coupon.couponId;

  /*
   * Do NOT recalculate the discount here.
   *
   * The Customer already paid the amount
   * approved inside checkoutSnapshot.
   *
   * We only revalidate whether the Coupon
   * may still be consumed as a redemption.
   */
  const consumedCoupon = await Coupon.findOneAndUpdate(
    {
      _id: couponId,

      isActive: true,

      minimumOrderAmount: {
        $lte: checkoutSnapshot.subtotal,
      },

      $and: [
        {
          $or: [
            {
              startsAt: null,
            },
            {
              startsAt: {
                $lte: now,
              },
            },
          ],
        },

        {
          $or: [
            {
              expiresAt: null,
            },
            {
              expiresAt: {
                $gt: now,
              },
            },
          ],
        },

        /*
         * Unlimited Coupon
         *
         * OR
         *
         * usedCount < usageLimit
         */
        {
          $or: [
            {
              usageLimit: null,
            },

            {
              $expr: {
                $lt: ['$usedCount', '$usageLimit'],
              },
            },
          ],
        },
      ],
    },

    {
      $inc: {
        usedCount: 1,
      },
    },

    {
      session,
      returnDocument: 'after',
    },
  )
    .select('_id usedCount usageLimit')
    .lean();

  if (!consumedCoupon) {
    throwOrderFinalizationFailed(
      'The paid Coupon can no longer be redeemed for Order placement.',
    );
  }
}

function createOrderNumber(orderId) {
  /*
   * Deterministic from the MongoDB Order ID.
   *
   * Avoid random generation inside a
   * retryable Mongo transaction.
   */
  return `MS-${orderId.toString().toUpperCase()}`;
}

function toOrderPlacementResource(order) {
  return {
    id: order._id.toString(),

    orderNumber: order.orderNumber,

    orderStatus: order.orderStatus,

    placedAt: order.placedAt,

    items: order.items.map((item) => ({
      id: item._id.toString(),

      product: {
        id: item.productId.toString(),

        name: item.productName,

        brand: item.brand,

        sport: item.sport,

        category: {
          id: item.categoryId.toString(),

          name: item.categoryName,
        },
      },

      variant: item.variantId
        ? {
            id: item.variantId.toString(),

            options: item.variantOptions ?? {},
          }
        : null,

      quantity: item.quantity,

      /*
       * Historical snapshot semantics:
       *
       * item.unitPrice =
       * pre-Product-discount price.
       */
      pricing: {
        basePrice: item.unitPrice,

        itemDiscount: item.itemDiscount,

        unitPrice: item.unitPrice - item.itemDiscount,

        lineTotal: item.lineTotal,
      },
    })),

    shippingAddress: {
      ...order.shippingAddress,
    },

    coupon: order.coupon
      ? {
          id: order.coupon.couponId.toString(),

          code: order.coupon.code,

          discountType: order.coupon.discountType,

          discountValue: order.coupon.discountValue,

          discountAmount: order.coupon.discountAmount,
        }
      : null,

    pricing: {
      subtotal: order.subtotal,

      discountAmount: order.discountAmount,

      totalAmount: order.totalAmount,
    },
  };
}

export async function finalizeOrderForSucceededPayment({ paymentId }) {
  if (!mongoose.isValidObjectId(paymentId)) {
    throw new TypeError(
      'A valid Payment ID is required for Order finalization.',
    );
  }

  /*
   * Generate these ONCE outside the retryable
   * transaction callback.
   *
   * If MongoDB retries the transaction,
   * the logical Order identity stays stable.
   */
  const proposedOrderId = new mongoose.Types.ObjectId();

  const proposedOrderNumber = createOrderNumber(proposedOrderId);

  const placedAt = new Date();

  let placedOrder = null;

  try {
    await mongoose.connection.transaction(
      async (session) => {
        placedOrder = null;

        /*
         * 1. Re-read Payment inside transaction.
         */
        const payment = await Payment.findById(paymentId)
          .session(session)
          .lean();

        if (!payment) {
          throwPaymentNotFound();
        }

        /*
         * 2. Idempotency check BEFORE
         *    any commerce effects.
         */
        const existingOrder = await Order.findOne({
          paymentId: payment._id,
        })
          .session(session)
          .lean();

        if (existingOrder) {
          placedOrder = existingOrder;

          return;
        }

        /*
         * Payment provider truth must already
         * be persisted before Order work.
         */
        if (
          payment.status !== PAYMENT_STATUSES.SUCCEEDED ||
          !payment.providerPaymentId ||
          !payment.verifiedAt
        ) {
          throwOrderFinalizationFailed(
            'Only a backend-verified successful Payment can create an Order.',
          );
        }

        const checkoutSnapshot = payment.checkoutSnapshot;

        /*
         * Defensive historical-integrity check.
         */
        if (
          !checkoutSnapshot ||
          !Array.isArray(checkoutSnapshot.items) ||
          checkoutSnapshot.items.length === 0 ||
          payment.amount !== checkoutSnapshot.totalAmount ||
          payment.currency !== 'INR'
        ) {
          throwOrderFinalizationFailed(
            'The verified Payment does not contain a valid Checkout snapshot.',
          );
        }

        assertUniqueSnapshotLines(checkoutSnapshot.items);

        /*
         * 3. Inventory decrements.
         *
         * 4. Prepare matching adjustment history.
         *
         * Do this sequentially inside the
         * transaction rather than Promise.all().
         */
        const inventoryAdjustments = [];

        for (const item of checkoutSnapshot.items) {
          const adjustment = await decrementInventoryForOrderItem({
            item,

            orderId: proposedOrderId,

            session,
          });

          inventoryAdjustments.push(adjustment);
        }

        /*
         * 5. Persist audit history.
         *
         * Failure here rolls Inventory back.
         */
        await InventoryAdjustment.create(inventoryAdjustments, {
          session,
        });

        /*
         * 6. Consume Coupon.
         *
         * Failure here rolls back Inventory
         * and InventoryAdjustment records.
         */
        await consumeCheckoutCoupon({
          checkoutSnapshot,
          session,
          now: placedAt,
        });

        /*
         * 7. Create immutable Order from
         *    Payment.checkoutSnapshot.
         *
         * Do not re-read current Product prices
         * or shipping address.
         */
        const [createdOrder] = await Order.create(
          [
            {
              _id: proposedOrderId,

              orderNumber: proposedOrderNumber,

              customerId: payment.customerId,

              paymentId: payment._id,

              items: checkoutSnapshot.items,

              shippingAddress: checkoutSnapshot.shippingAddress,

              coupon: checkoutSnapshot.coupon ?? null,

              subtotal: checkoutSnapshot.subtotal,

              discountAmount: checkoutSnapshot.discountAmount,

              totalAmount: checkoutSnapshot.totalAmount,

              orderStatus: ORDER_STATUSES.PLACED,

              placedAt,
            },
          ],

          {
            session,
          },
        );

        placedOrder = createdOrder.toObject({
          depopulate: true,
        });

        /*
         * Successful callback:
         *
         * MongoDB commits:
         *
         * Inventory
         * InventoryAdjustments
         * Coupon usedCount
         * Order
         *
         * together.
         */
      },

      {
        readPreference: 'primary',
      },
    );
  } catch (error) {
    /*
     * The unique Order.paymentId index
     * remains the final race-condition guard.
     *
     * If another concurrent finalizer committed
     * first, return the existing Order instead
     * of treating the retry as another purchase.
     */
    if (isDuplicateKeyError(error)) {
      const existingOrder = await Order.findOne({
        paymentId,
      }).lean();

      if (existingOrder) {
        return toOrderPlacementResource(existingOrder);
      }
    }

    throw error;
  }

  if (!placedOrder) {
    throwOrderFinalizationFailed();
  }

  return toOrderPlacementResource(placedOrder);
}

function throwCustomerOrderNotFound() {
  throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
}

function getOrderItemCount(items) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

function toCustomerOrderListPaymentResource(payment) {
  if (!payment?._id) {
    return null;
  }

  return {
    id: payment._id.toString(),
    status: payment.status,
  };
}

function toCustomerOrderDetailPaymentResource(payment) {
  if (!payment?._id) {
    return null;
  }

  return {
    id: payment._id.toString(),

    provider: payment.provider,

    status: payment.status,

    providerOrderId: payment.providerOrderId,

    providerPaymentId: payment.providerPaymentId ?? null,

    amount: payment.amount,

    currency: payment.currency,

    verifiedAt: payment.verifiedAt ?? null,
  };
}

function toCustomerOrderListResource(order) {
  return {
    id: order._id.toString(),

    orderNumber: order.orderNumber,

    placedAt: order.placedAt,

    orderStatus: order.orderStatus,

    itemCount: getOrderItemCount(order.items),

    payment: toCustomerOrderListPaymentResource(order.paymentId),

    pricing: {
      totalAmount: order.totalAmount,
    },
  };
}

function toCustomerOrderItemResource(item) {
  return {
    id: item._id.toString(),

    product: {
      id: item.productId.toString(),

      name: item.productName,

      brand: item.brand,

      sport: item.sport,

      category: {
        id: item.categoryId.toString(),

        name: item.categoryName,
      },
    },

    variant: item.variantId
      ? {
          id: item.variantId.toString(),

          options: item.variantOptions ?? {},
        }
      : null,

    quantity: item.quantity,

    pricing: {
      basePrice: item.unitPrice,

      itemDiscount: item.itemDiscount,

      unitPrice: item.unitPrice - item.itemDiscount,

      lineTotal: item.lineTotal,
    },
  };
}

function toCustomerOrderCouponResource(coupon) {
  if (!coupon) {
    return null;
  }

  return {
    id: coupon.couponId.toString(),

    code: coupon.code,

    discountType: coupon.discountType,

    discountValue: coupon.discountValue,

    discountAmount: coupon.discountAmount,
  };
}

function toCustomerOrderDetailResource(order) {
  return {
    id: order._id.toString(),

    orderNumber: order.orderNumber,

    orderStatus: order.orderStatus,

    placedAt: order.placedAt,

    cancelledAt: order.cancelledAt ?? null,

    items: order.items.map(toCustomerOrderItemResource),

    shippingAddress: {
      ...order.shippingAddress,
    },

    coupon: toCustomerOrderCouponResource(order.coupon),

    pricing: {
      subtotal: order.subtotal,

      discountAmount: order.discountAmount,

      totalAmount: order.totalAmount,
    },

    payment: toCustomerOrderDetailPaymentResource(order.paymentId),
  };
}

export async function getCustomerOrders({
  customerId,
  page,
  limit,
  status,
  sort,
  order,
}) {
  if (!mongoose.isValidObjectId(customerId)) {
    throw new TypeError('A valid Customer ID is required for Order history.');
  }

  const filter = {
    customerId,
  };

  if (status) {
    filter.orderStatus = status;
  }

  const direction = order === 'asc' ? 1 : -1;

  const sortDefinition = {
    [sort]: direction,
    _id: direction,
  };

  const skip = (page - 1) * limit;

  const [orders, totalItems] = await Promise.all([
    Order.find(filter)
      .select(
        '_id orderNumber paymentId items totalAmount orderStatus placedAt',
      )
      .populate({
        path: 'paymentId',
        select: '_id status',
      })
      .sort(sortDefinition)
      .skip(skip)
      .limit(limit)
      .lean(),

    Order.countDocuments(filter),
  ]);

  return {
    items: orders.map(toCustomerOrderListResource),

    meta: {
      page,

      limit,

      totalItems,

      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

export async function getCustomerOrder({ customerId, orderId }) {
  if (!mongoose.isValidObjectId(customerId)) {
    throw new TypeError('A valid Customer ID is required for Order details.');
  }

  if (!mongoose.isValidObjectId(orderId)) {
    throwCustomerOrderNotFound();
  }

  const order = await Order.findOne({
    _id: orderId,

    customerId,
  })
    .select(
      '_id orderNumber paymentId items shippingAddress coupon subtotal discountAmount totalAmount orderStatus placedAt cancelledAt',
    )
    .populate({
      path: 'paymentId',

      select:
        '_id provider status providerOrderId providerPaymentId amount currency verifiedAt',
    })
    .lean();

  if (!order) {
    throwCustomerOrderNotFound();
  }

  return toCustomerOrderDetailResource(order);
}

export async function cancelCustomerOrder({ customerId, orderId }) {
  if (!mongoose.isValidObjectId(customerId)) {
    throw new TypeError(
      'A valid Customer ID is required for Order cancellation.',
    );
  }

  if (!mongoose.isValidObjectId(orderId)) {
    throwCustomerOrderNotFound();
  }

  /*
   * Generate once outside the retryable transaction.
   *
   * If MongoDB retries the transaction, the logical
   * cancellation time remains stable.
   */
  const cancelledAt = new Date();

  await mongoose.connection.transaction(
    async (session) => {
      /*
       * Ownership-safe lookup.
       *
       * Another Customer's Order behaves exactly like
       * a nonexistent Order.
       */
      const order = await Order.findOne({
        _id: orderId,
        customerId,
      })
        .select('_id items orderStatus')
        .session(session)
        .lean();

      if (!order) {
        throwCustomerOrderNotFound();
      }

      /*
       * Customer cancellation rule is intentionally narrow.
       */
      if (order.orderStatus !== ORDER_STATUSES.PLACED) {
        throwCustomerOrderNotCancellable();
      }

      /*
       * Compare-and-set transition.
       *
       * Do not blindly overwrite orderStatus.
       *
       * This protects against another concurrent process
       * changing the Order after our initial read.
       */
      const cancelledOrder = await Order.findOneAndUpdate(
        {
          _id: order._id,

          customerId,

          orderStatus: ORDER_STATUSES.PLACED,
        },

        {
          $set: {
            orderStatus: ORDER_STATUSES.CANCELLED,

            cancelledAt,
          },
        },

        {
          session,

          returnDocument: 'after',

          runValidators: true,
        },
      )
        .select('_id')
        .lean();

      if (!cancelledOrder) {
        throwCustomerOrderNotCancellable();
      }

      /*
       * Restore every purchased Inventory position.
       *
       * Order items are historical purchase snapshots,
       * so quantity and Product/Variant identity come
       * from the Order rather than current Cart state.
       */
      const inventoryAdjustments = [];

      for (const item of order.items) {
        const adjustment = await restoreInventoryForCancelledOrderItem({
          item,

          orderId: order._id,

          session,
        });

        inventoryAdjustments.push(adjustment);
      }

      /*
       * Stock restoration and adjustment history are
       * part of the SAME transaction.
       *
       * If adjustment persistence fails,
       * Order cancellation and Inventory restoration
       * are rolled back together.
       */
      await InventoryAdjustment.create(inventoryAdjustments, {
        session,
      });
    },

    {
      readPreference: 'primary',
    },
  );

  /*
   * Transaction has committed.
   *
   * Reload through the existing Customer detail service
   * so the response uses the same authoritative resource
   * shape as GET /orders/:orderId.
   */
  return getCustomerOrder({
    customerId,
    orderId,
  });
}

export async function getAdminOrders({
  page,
  limit,
  q,
  status,
  customerId,
  dateFrom,
  dateTo,
  sort,
  order,
}) {
  const filter = {};

  if (q) {
    filter.orderNumber = {
      $regex: escapeRegularExpression(q),

      $options: 'i',
    };
  }

  if (status) {
    filter.orderStatus = status;
  }

  if (customerId) {
    filter.customerId = customerId;
  }

  if (dateFrom || dateTo) {
    filter.placedAt = {};

    if (dateFrom) {
      filter.placedAt.$gte = dateFrom;
    }

    if (dateTo) {
      /*
       * dateTo is inclusive for the Admin.
       *
       * Example:
       * dateTo = 2026-08-19
       *
       * Query:
       * placedAt < 2026-08-20T00:00:00.000Z
       */
      const dateToExclusive = new Date(dateTo);

      dateToExclusive.setUTCDate(dateToExclusive.getUTCDate() + 1);

      filter.placedAt.$lt = dateToExclusive;
    }
  }

  const direction = order === 'asc' ? 1 : -1;

  const sortDefinition = {
    [sort]: direction,

    _id: direction,
  };

  const skip = (page - 1) * limit;

  const [orders, totalItems] = await Promise.all([
    Order.find(filter)
      .select(
        '_id orderNumber customerId paymentId items totalAmount orderStatus placedAt',
      )
      .populate({
        path: 'customerId',

        select: '_id name email phone',
      })
      .populate({
        path: 'paymentId',

        select: '_id status',
      })
      .sort(sortDefinition)
      .skip(skip)
      .limit(limit)
      .lean(),

    Order.countDocuments(filter),
  ]);

  return {
    items: orders.map(toAdminOrderListResource),

    meta: {
      page,

      limit,

      totalItems,

      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

export async function getAdminOrder(orderId) {
  if (!mongoose.isValidObjectId(orderId)) {
    throwAdminOrderNotFound();
  }

  const order = await Order.findById(orderId)
    .select(
      [
        '_id',
        'orderNumber',
        'customerId',
        'paymentId',
        'items',
        'shippingAddress',
        'coupon',
        'subtotal',
        'discountAmount',
        'totalAmount',
        'orderStatus',
        'placedAt',
        'cancelledAt',
      ].join(' '),
    )
    .populate({
      path: 'customerId',

      select: '_id name email phone',
    })
    .populate({
      path: 'paymentId',

      select:
        '_id provider status providerOrderId providerPaymentId amount currency verifiedAt',
    })
    .lean();

  if (!order) {
    throwAdminOrderNotFound();
  }

  return toAdminOrderDetailResource(order);
}