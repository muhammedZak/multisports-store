import { Order, ORDER_STATUSES } from '../order/order.model.js';

import { Payment, PAYMENT_STATUSES } from '../payment/payment.model.js';

import { User } from '../users/user.model.js';
import { Product } from '../catalog/product.model.js';
import { Inventory } from '../inventory/inventory.model.js';

import { Refund } from '../refund/refund.model.js';

import { REFUND_ORIGINS, REFUND_STATUSES } from '../refund/refund.constants.js';

import { env } from '../../config/env.js';

const DASHBOARD_PREVIEW_LIMIT = 5;

const PENDING_ORDER_STATUSES = Object.freeze([
  ORDER_STATUSES.PLACED,
  ORDER_STATUSES.CONFIRMED,
  ORDER_STATUSES.PROCESSING,
]);

function toRecentOrderResource(order) {
  return {
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    customerId: order.customerId.toString(),
    totalAmount: order.totalAmount,
    orderStatus: order.orderStatus,
    placedAt: order.placedAt,
  };
}

function toRefundRequestResource(refund) {
  return {
    id: refund._id.toString(),
    orderId: refund.orderId.toString(),
    customerId: refund.customerId.toString(),
    amount: refund.amount,
    status: refund.status,
    reason: refund.reason,
    requestedAt: refund.requestedAt,
  };
}

function getVariantById(product, variantId) {
  if (!variantId) {
    return null;
  }

  return product.variants.find(
    (variant) => variant._id.toString() === variantId.toString(),
  );
}

function isPurchasableInventoryPosition(inventory, product) {
  if (!product?.isActive) {
    return false;
  }

  const variants = Array.isArray(product.variants) ? product.variants : [];

  // Simple Product.
  if (variants.length === 0) {
    return inventory.variantId === undefined || inventory.variantId === null;
  }

  // Variant Product.
  const variant = getVariantById(product, inventory.variantId);

  return Boolean(variant?.isActive);
}

function getStockState(quantity) {
  if (quantity === 0) {
    return 'out_of_stock';
  }

  if (quantity <= env.lowStockThreshold) {
    return 'low_stock';
  }

  return 'in_stock';
}

function toInventoryPreviewResource(inventory, product) {
  const variant = getVariantById(product, inventory.variantId);

  return {
    id: inventory._id.toString(),

    product: {
      id: product._id.toString(),
      name: product.name,
      brand: product.brand,
      sport: product.sport,
    },

    variant: variant
      ? {
          id: variant._id.toString(),
          options: variant.options ?? {},
        }
      : null,

    quantity: inventory.quantity,
    stockState: getStockState(inventory.quantity),
  };
}

async function getRecognizedRevenue() {
  /*
   * Revenue authority:
   *
   * Order exists
   * + Payment.status === succeeded
   * + Order is not cancelled.
   *
   * We deliberately sum Order.totalAmount rather than Payment.amount.
   */
  const result = await Order.aggregate([
    {
      $match: {
        orderStatus: {
          $ne: ORDER_STATUSES.CANCELLED,
        },
      },
    },

    {
      $lookup: {
        from: Payment.collection.name,
        localField: 'paymentId',
        foreignField: '_id',
        as: 'payment',
      },
    },

    {
      $match: {
        'payment.status': PAYMENT_STATUSES.SUCCEEDED,
      },
    },

    {
      $group: {
        _id: null,
        grossSales: {
          $sum: '$totalAmount',
        },
      },
    },
  ]);

  const grossSales = result[0]?.grossSales ?? 0;

  /*
   * Only confirmed Customer-request refunds reduce recognized revenue.
   *
   * Cancellation refunds are NOT deducted because cancelled Orders were
   * already removed above.
   *
   * System compensation refunds are also excluded.
   */
  const refundResult = await Refund.aggregate([
    {
      $match: {
        origin: REFUND_ORIGINS.CUSTOMER_REQUEST,
        status: REFUND_STATUSES.REFUNDED,
      },
    },

    {
      $group: {
        _id: null,
        refundedAmount: {
          $sum: '$amount',
        },
      },
    },
  ]);

  const refundedAmount = refundResult[0]?.refundedAmount ?? 0;

  return Math.max(0, grossSales - refundedAmount);
}

async function getInventoryDashboardData() {
  /*
   * Load active Product context and Inventory in two batch queries.
   * No N+1 Product queries are introduced.
   */
  const products = await Product.find({
    isActive: true,
  })
    .select('_id name brand sport variants isActive')
    .lean();

  if (products.length === 0) {
    return {
      lowStockProducts: 0,
      outOfStockProducts: 0,
      lowStockItems: [],
      outOfStockItems: [],
    };
  }

  const productIds = products.map((product) => product._id);

  const inventories = await Inventory.find({
    productId: {
      $in: productIds,
    },
  })
    .select('_id productId variantId quantity updatedAt')
    .sort({
      updatedAt: -1,
      _id: -1,
    })
    .lean();

  const productById = new Map(
    products.map((product) => [product._id.toString(), product]),
  );

  const lowStockProductIds = new Set();
  const outOfStockProductIds = new Set();

  const lowStockItems = [];
  const outOfStockItems = [];

  for (const inventory of inventories) {
    const product = productById.get(inventory.productId.toString());

    if (!product) {
      continue;
    }

    /*
     * Inactive Variants retain Inventory history but are not currently
     * customer-purchasable, so they must not affect Dashboard stock alerts.
     */
    if (!isPurchasableInventoryPosition(inventory, product)) {
      continue;
    }

    const stockState = getStockState(inventory.quantity);

    if (stockState === 'low_stock') {
      lowStockProductIds.add(product._id.toString());

      if (lowStockItems.length < DASHBOARD_PREVIEW_LIMIT) {
        lowStockItems.push(toInventoryPreviewResource(inventory, product));
      }

      continue;
    }

    if (stockState === 'out_of_stock') {
      outOfStockProductIds.add(product._id.toString());

      if (outOfStockItems.length < DASHBOARD_PREVIEW_LIMIT) {
        outOfStockItems.push(toInventoryPreviewResource(inventory, product));
      }
    }
  }

  return {
    /*
     * Product IDs are stored in Sets so a Product with several
     * low-stock/out-of-stock Variants is counted only once.
     */
    lowStockProducts: lowStockProductIds.size,
    outOfStockProducts: outOfStockProductIds.size,

    lowStockItems,
    outOfStockItems,
  };
}

export async function getAdminDashboard() {
  const [
    totalRevenue,

    totalOrders,

    totalCustomers,

    totalProducts,

    activeProducts,

    pendingOrders,

    refundRequests,

    recentOrders,

    recentRefundRequests,

    inventory,
  ] = await Promise.all([
    getRecognizedRevenue(),

    Order.countDocuments(),

    User.countDocuments({
      role: 'customer',
    }),

    Product.countDocuments(),

    Product.countDocuments({
      isActive: true,
    }),

    Order.countDocuments({
      orderStatus: {
        $in: PENDING_ORDER_STATUSES,
      },
    }),

    Refund.countDocuments({
      origin: REFUND_ORIGINS.CUSTOMER_REQUEST,
      status: REFUND_STATUSES.REQUESTED,
    }),

    Order.find()
      .select('_id orderNumber customerId totalAmount orderStatus placedAt')
      .sort({
        placedAt: -1,
        _id: -1,
      })
      .limit(DASHBOARD_PREVIEW_LIMIT)
      .lean(),

    Refund.find({
      origin: REFUND_ORIGINS.CUSTOMER_REQUEST,
      status: REFUND_STATUSES.REQUESTED,
    })
      .select('_id orderId customerId amount status reason requestedAt')
      .sort({
        requestedAt: -1,
        _id: -1,
      })
      .limit(DASHBOARD_PREVIEW_LIMIT)
      .lean(),

    getInventoryDashboardData(),
  ]);

  return {
    kpis: {
      totalRevenue,
      totalOrders,
      totalCustomers,
      totalProducts,
      activeProducts,
      pendingOrders,
      lowStockProducts: inventory.lowStockProducts,
      outOfStockProducts: inventory.outOfStockProducts,
      refundRequests,
    },

    recentOrders: recentOrders.map(toRecentOrderResource),

    refundRequests: recentRefundRequests.map(toRefundRequestResource),

    lowStockItems: inventory.lowStockItems,

    outOfStockItems: inventory.outOfStockItems,
  };
}
