import { isDeepStrictEqual } from 'node:util';

import { getCurrentProductPrice } from '../../modules/catalog/product.service.js';
import { validateCouponForSubtotal } from '../../modules/coupon/coupon.service.js';
import {
  INVENTORY_ADJUSTMENT_REASONS,
  STOCK_STATES,
} from '../../modules/inventory/inventory.constants.js';
import {
  PAYMENT_COMMERCE_RESOLUTIONS,
  PAYMENT_STATUSES,
  Payment,
} from '../../modules/payment/payment.model.js';
import { ORDER_STATUSES, Order } from '../../modules/order/order.model.js';
import { CART_DEFINITIONS } from './cart.seed.js';
import { SeedValidationError } from './seed.utils.js';

export const HISTORICAL_COMMERCE_PRODUCT_KEYS = Object.freeze([
  'product:football:stride-control-boots',
  'product:football:touchline-shin-guards',
  'product:cricket:willowcraft-english-bat',
  'product:cricket:guardflex-batting-pads',
  'product:basketball:elevate-court-shoes',
  'product:basketball:driveguard-knee-sleeves',
  'product:tennis:rallypoint-control-racquet',
  'product:tennis:spinpath-overgrip-pack',
  'product:badminton:aerostrike-control-racquet',
  'product:badminton:swiftcourt-indoor-shoes',
  'product:running:temporun-daily-trainers',
  'product:running:endurance-breathable-tee',
  'product:fitness:corelift-cast-kettlebell',
  'product:fitness:balanceflow-yoga-mat',
]);

export const HISTORICAL_CUSTOMER_ORDER_COUNTS = Object.freeze({
  'user:checkout': 2,
  'user:orders': 12,
  'user:reviews': 8,
  'user:ratings': 8,
  'user:refunds': 8,
  'user:support': 4,
  'user:fresh': 0,
});

export const HISTORICAL_STATUS_COUNTS = Object.freeze({
  [ORDER_STATUSES.PLACED]: 6,
  [ORDER_STATUSES.CONFIRMED]: 5,
  [ORDER_STATUSES.PROCESSING]: 5,
  [ORDER_STATUSES.SHIPPED]: 5,
  [ORDER_STATUSES.DELIVERED]: 17,
  [ORDER_STATUSES.CANCELLED]: 4,
});

const CUSTOMER_STATUS_BLOCKS = Object.freeze([
  Object.freeze({
    customerSeedKey: 'user:checkout',
    statuses: Object.freeze([
      ORDER_STATUSES.PLACED,
      ORDER_STATUSES.CONFIRMED,
    ]),
  }),
  Object.freeze({
    customerSeedKey: 'user:orders',
    statuses: Object.freeze([
      ORDER_STATUSES.PLACED,
      ORDER_STATUSES.PLACED,
      ORDER_STATUSES.PLACED,
      ORDER_STATUSES.CONFIRMED,
      ORDER_STATUSES.CONFIRMED,
      ORDER_STATUSES.PROCESSING,
      ORDER_STATUSES.PROCESSING,
      ORDER_STATUSES.PROCESSING,
      ORDER_STATUSES.SHIPPED,
      ORDER_STATUSES.SHIPPED,
      ORDER_STATUSES.SHIPPED,
      ORDER_STATUSES.CANCELLED,
    ]),
  }),
  Object.freeze({
    customerSeedKey: 'user:reviews',
    statuses: Object.freeze([
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.SHIPPED,
      ORDER_STATUSES.PLACED,
    ]),
  }),
  Object.freeze({
    customerSeedKey: 'user:ratings',
    statuses: Object.freeze([
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.CONFIRMED,
      ORDER_STATUSES.PROCESSING,
    ]),
  }),
  Object.freeze({
    customerSeedKey: 'user:refunds',
    statuses: Object.freeze([
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.CANCELLED,
      ORDER_STATUSES.CANCELLED,
      ORDER_STATUSES.CANCELLED,
    ]),
  }),
  Object.freeze({
    customerSeedKey: 'user:support',
    statuses: Object.freeze([
      ORDER_STATUSES.PLACED,
      ORDER_STATUSES.CONFIRMED,
      ORDER_STATUSES.PROCESSING,
      ORDER_STATUSES.SHIPPED,
    ]),
  }),
]);

const RECENT_DATE_OFFSETS = Object.freeze([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 7]);
const THIRTY_DAY_OFFSETS = Object.freeze([8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]);
const YEAR_DATE_OFFSETS = Object.freeze([
  40, 47, 55, 64, 73, 82, 92, 103, 115, 127, 138, 145, 152, 156, 159,
  162, 164, 165,
]);
const ALL_DATE_OFFSETS = Object.freeze([
  ...RECENT_DATE_OFFSETS,
  ...THIRTY_DAY_OFFSETS,
  ...YEAR_DATE_OFFSETS,
]);

const TWO_ITEM_ORDER_ORDINALS = new Set([15, 23, 31, 32, 33, 34, 35]);
const COUPON_BY_ORDER_ORDINAL = Object.freeze({
  3: 'coupon:LIMITED5',
  15: 'coupon:LIMITED5',
  23: 'coupon:LIMITED5',
  31: 'coupon:USEDUP250',
  32: 'coupon:USEDUP250',
  33: 'coupon:USEDUP250',
  34: 'coupon:USEDUP250',
});

const STATUS_DELAY_MILLISECONDS = Object.freeze({
  [ORDER_STATUSES.PLACED]: 30 * 60 * 1000,
  [ORDER_STATUSES.CONFIRMED]: 6 * 60 * 60 * 1000,
  [ORDER_STATUSES.PROCESSING]: 24 * 60 * 60 * 1000,
  [ORDER_STATUSES.SHIPPED]: 2 * 24 * 60 * 60 * 1000,
  [ORDER_STATUSES.DELIVERED]: 4 * 24 * 60 * 60 * 1000,
  [ORDER_STATUSES.CANCELLED]: 24 * 60 * 60 * 1000,
});

const SNAPSHOT_FIELDS = Object.freeze([
  '_id',
  'productId',
  'variantId',
  'productName',
  'brand',
  'sport',
  'categoryId',
  'categoryName',
  'variantOptions',
  'quantity',
  'unitPrice',
  'itemDiscount',
  'lineTotal',
]);

function idString(value) {
  return value?.toString();
}

function assertMatrix(condition, code, message) {
  if (!condition) {
    throw new SeedValidationError(code, message);
  }
}

function ordinalText(ordinal) {
  return String(ordinal).padStart(2, '0');
}

function addMilliseconds(date, milliseconds) {
  return new Date(date.getTime() + milliseconds);
}

function itemCountForOrder(ordinal) {
  return TWO_ITEM_ORDER_ORDINALS.has(ordinal) ? 2 : 1;
}

function buildOrderScenarioPlan() {
  const scenarios = [];
  let ordinal = 0;

  for (const block of CUSTOMER_STATUS_BLOCKS) {
    for (const status of block.statuses) {
      ordinal += 1;
      const dateOffsetDays = ALL_DATE_OFFSETS[ordinal - 1];
      const dateBucket =
        ordinal <= 12
          ? 'current_7_days'
          : ordinal <= 24
            ? 'days_8_to_30'
            : 'earlier_current_year';

      scenarios.push(
        Object.freeze({
          ordinal,
          customerSeedKey: block.customerSeedKey,
          status,
          itemCount: itemCountForOrder(ordinal),
          dateOffsetDays,
          dateBucket,
          couponSeedKey: COUPON_BY_ORDER_ORDINAL[ordinal] ?? null,
        }),
      );
    }
  }

  return scenarios;
}

function productIndexesForOrder(ordinal, itemCount) {
  if (ordinal >= 15 && ordinal <= 20) {
    return ordinal === 15 ? [0, 1] : [ordinal - 14];
  }

  if (ordinal >= 23 && ordinal <= 28) {
    return ordinal === 23 ? [7, 8] : [ordinal - 15];
  }

  const start = (ordinal * 5) % HISTORICAL_COMMERCE_PRODUCT_KEYS.length;

  return Array.from(
    { length: itemCount },
    (_, lineIndex) => (start + lineIndex) % HISTORICAL_COMMERCE_PRODUCT_KEYS.length,
  );
}

function shippingSnapshot(user, ordinal) {
  const address = user.addresses[ordinal % user.addresses.length];

  assertMatrix(
    address,
    'DEMO_COMMERCE_SHIPPING_ADDRESS_MISSING',
    `User ${user.seedKey} has no deterministic shipping address.`,
  );

  return {
    fullName: address.fullName,
    phone: address.phone,
    address: address.address,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  };
}

function snapshotItemFields(item) {
  return Object.fromEntries(SNAPSHOT_FIELDS.map((field) => [field, item[field]]));
}

function buildCommerceItem({
  registry,
  itemSeedKey,
  product,
  category,
}) {
  const variant = product.variants[0];
  const effectivePrice = getCurrentProductPrice(product);
  const itemDiscount = product.basePrice - effectivePrice;

  return {
    _id: registry.idFor(itemSeedKey),
    productId: product._id,
    variantId: variant._id,
    productName: product.name,
    brand: product.brand,
    sport: product.sport,
    categoryId: category._id,
    categoryName: category.name,
    variantOptions: { ...variant.options },
    quantity: 1,
    unitPrice: product.basePrice,
    itemDiscount,
    lineTotal: effectivePrice,
  };
}

function pricingForItems({ items, coupon, now, historicalUsedCount }) {
  const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);

  if (!coupon) {
    return {
      coupon: null,
      subtotal,
      discountAmount: 0,
      totalAmount: subtotal,
    };
  }

  const result = validateCouponForSubtotal({
    coupon: { ...coupon, usedCount: historicalUsedCount },
    subtotal,
    now,
  });

  return {
    coupon: {
      couponId: coupon._id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: result.discountAmount,
    },
    subtotal,
    discountAmount: result.discountAmount,
    totalAmount: result.totalAmount,
  };
}

function providerOrderId(paymentId) {
  return `demo_rzp_order_${idString(paymentId)}`;
}

function providerPaymentId(paymentId) {
  return `demo_rzp_payment_${idString(paymentId)}`;
}

function comparableSnapshot(value) {
  return JSON.parse(
    JSON.stringify(value, (_, item) =>
      item?._bsontype === 'ObjectId' ? item.toString() : item,
    ),
  );
}

function buildPool({ productDefinitions, categories, inventoryPositions }) {
  const productByKey = new Map(
    productDefinitions.map((product) => [product.seedKey, product]),
  );
  const categoryByKey = new Map(
    categories.map((category) => [category.categoryKey, category]),
  );
  const pool = HISTORICAL_COMMERCE_PRODUCT_KEYS.map((seedKey) => {
    const product = productByKey.get(seedKey);
    const variant = product?.variants?.[0];
    const inventory = inventoryPositions.find(
      (position) =>
        position.productSeedKey === seedKey &&
        idString(position.variantId) === idString(variant?._id),
    );
    const category = categoryByKey.get(product?.categoryKey);

    assertMatrix(
      product?.isActive === true &&
        product.productType === 'variant' &&
        variant?.isActive === true &&
        category &&
        inventory?.stockState === STOCK_STATES.IN_STOCK &&
        inventory.quantity > 0,
      'DEMO_COMMERCE_POOL_PRODUCT_INVALID',
      `Historical commerce Product ${seedKey} is not active and in stock.`,
    );

    return { seedKey, product, variant, category, inventory };
  });

  return pool;
}

function buildOrderBackedDefinitions({
  registry,
  clock,
  pool,
  usersByKey,
  couponsByKey,
}) {
  const couponCounters = new Map([
    ['coupon:USEDUP250', 0],
    ['coupon:LIMITED5', 0],
  ]);
  const payments = [];
  const orders = [];

  for (const scenario of buildOrderScenarioPlan()) {
    const ordinal = scenario.ordinal;
    const ordinalLabel = ordinalText(ordinal);
    const orderSeedKey = `order:historical:${ordinalLabel}`;
    const paymentSeedKey = `payment:order:${ordinalLabel}`;
    const orderId = registry.idFor(orderSeedKey);
    const paymentId = registry.idFor(paymentSeedKey);
    const user = usersByKey.get(scenario.customerSeedKey);
    const placedDate = clock.daysAgo(scenario.dateOffsetDays);
    const placedAt = clock.atLocalTime(placedDate, {
      hour: 9,
      minute: ordinal % 60,
    });
    const createdAt = addMilliseconds(placedAt, -30 * 60 * 1000);
    const verifiedAt = addMilliseconds(placedAt, -10 * 60 * 1000);
    const statusAt = addMilliseconds(
      placedAt,
      STATUS_DELAY_MILLISECONDS[scenario.status],
    );
    const cartReconciledAt = addMilliseconds(placedAt, 10 * 60 * 1000);
    const productIndexes = productIndexesForOrder(
      ordinal,
      scenario.itemCount,
    );
    const items = productIndexes.map((productIndex, lineIndex) => {
      const selected = pool[productIndex];
      const itemSeedKey =
        `commerce-item:order:${ordinalLabel}:` +
        String(lineIndex + 1).padStart(2, '0');

      return buildCommerceItem({
        registry,
        itemSeedKey,
        product: selected.product,
        category: selected.category,
      });
    });
    const coupon = scenario.couponSeedKey
      ? couponsByKey.get(scenario.couponSeedKey)
      : null;
    const historicalUsedCount = scenario.couponSeedKey
      ? couponCounters.get(scenario.couponSeedKey)
      : 0;
    const pricing = pricingForItems({
      items,
      coupon,
      now: placedAt,
      historicalUsedCount,
    });

    if (scenario.couponSeedKey) {
      couponCounters.set(scenario.couponSeedKey, historicalUsedCount + 1);
    }

    const checkoutSnapshot = {
      items: items.map(snapshotItemFields),
      shippingAddress: shippingSnapshot(user, ordinal),
      coupon: pricing.coupon,
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      totalAmount: pricing.totalAmount,
    };
    const payment = {
      _id: paymentId,
      seedKey: paymentSeedKey,
      kind: 'order',
      orderSeedKey,
      customerSeedKey: scenario.customerSeedKey,
      customerId: user._id,
      provider: 'razorpay',
      providerOrderId: providerOrderId(paymentId),
      providerPaymentId: providerPaymentId(paymentId),
      amount: checkoutSnapshot.totalAmount,
      currency: 'INR',
      status: PAYMENT_STATUSES.SUCCEEDED,
      verifiedAt,
      commerceResolution: PAYMENT_COMMERCE_RESOLUTIONS.ORDER,
      checkoutSnapshot,
      createdAt,
      updatedAt: verifiedAt,
    };
    const order = {
      _id: orderId,
      seedKey: orderSeedKey,
      ordinal,
      dateBucket: scenario.dateBucket,
      customerSeedKey: scenario.customerSeedKey,
      orderNumber: `MS-${idString(orderId).toUpperCase()}`,
      customerId: user._id,
      paymentId,
      items: items.map(snapshotItemFields),
      shippingAddress: { ...checkoutSnapshot.shippingAddress },
      coupon: checkoutSnapshot.coupon
        ? { ...checkoutSnapshot.coupon }
        : null,
      subtotal: checkoutSnapshot.subtotal,
      discountAmount: checkoutSnapshot.discountAmount,
      totalAmount: checkoutSnapshot.totalAmount,
      orderStatus: scenario.status,
      placedAt,
      cartReconciledAt,
      ...(scenario.status === ORDER_STATUSES.CANCELLED
        ? { cancelledAt: statusAt }
        : {}),
      createdAt: placedAt,
      updatedAt: statusAt,
    };

    payments.push(payment);
    orders.push(order);
  }

  assertMatrix(
    couponCounters.get('coupon:USEDUP250') === 4 &&
      couponCounters.get('coupon:LIMITED5') === 3,
    'DEMO_COMMERCE_COUPON_HISTORY_INVALID',
    'Historical Coupon redemption counters must finish at 4 and 3.',
  );

  return { payments, orders, couponCounters };
}

function buildNonOrderPayments({ registry, clock, pool, usersByKey }) {
  const definitions = [
    {
      seedKey: 'payment:abandoned:01',
      itemSeedKey: 'commerce-item:abandoned:01:01',
      kind: 'abandoned',
      customerSeedKey: 'user:checkout',
      productIndex: 0,
      daysAgo: 2,
      status: PAYMENT_STATUSES.CREATED,
    },
    {
      seedKey: 'payment:abandoned:02',
      itemSeedKey: 'commerce-item:abandoned:02:01',
      kind: 'abandoned',
      customerSeedKey: 'user:orders',
      productIndex: 1,
      daysAgo: 4,
      status: PAYMENT_STATUSES.CREATED,
    },
    {
      seedKey: 'payment:system-compensation:01',
      itemSeedKey: 'commerce-item:system-compensation:01:01',
      kind: 'system_compensation',
      customerSeedKey: 'user:refunds',
      productIndex: 2,
      daysAgo: 45,
      status: PAYMENT_STATUSES.SUCCEEDED,
    },
    {
      seedKey: 'payment:system-compensation:02',
      itemSeedKey: 'commerce-item:system-compensation:02:01',
      kind: 'system_compensation',
      customerSeedKey: 'user:refunds',
      productIndex: 3,
      daysAgo: 60,
      status: PAYMENT_STATUSES.SUCCEEDED,
    },
  ];

  return definitions.map((definition, index) => {
    const paymentId = registry.idFor(definition.seedKey);
    const user = usersByKey.get(definition.customerSeedKey);
    const selected = pool[definition.productIndex];
    const item = buildCommerceItem({
      registry,
      itemSeedKey: definition.itemSeedKey,
      product: selected.product,
      category: selected.category,
    });
    const pricing = pricingForItems({
      items: [item],
      coupon: null,
      now: clock.anchorTime,
      historicalUsedCount: 0,
    });
    const createdAt = clock.atLocalTime(clock.daysAgo(definition.daysAgo), {
      hour: 11,
      minute: index,
    });
    const verifiedAt = addMilliseconds(createdAt, 10 * 60 * 1000);
    const succeeded = definition.status === PAYMENT_STATUSES.SUCCEEDED;

    return {
      _id: paymentId,
      seedKey: definition.seedKey,
      kind: definition.kind,
      customerSeedKey: definition.customerSeedKey,
      customerId: user._id,
      provider: 'razorpay',
      providerOrderId: providerOrderId(paymentId),
      ...(succeeded ? { providerPaymentId: providerPaymentId(paymentId) } : {}),
      amount: pricing.totalAmount,
      currency: 'INR',
      status: definition.status,
      checkoutSnapshot: {
        items: [snapshotItemFields(item)],
        shippingAddress: shippingSnapshot(user, index),
        coupon: null,
        subtotal: pricing.subtotal,
        discountAmount: 0,
        totalAmount: pricing.totalAmount,
      },
      ...(succeeded
        ? {
            verifiedAt,
            commerceResolution:
              PAYMENT_COMMERCE_RESOLUTIONS.SYSTEM_COMPENSATION,
          }
        : {}),
      createdAt,
      updatedAt: succeeded ? verifiedAt : createdAt,
    };
  });
}

export function buildReviewEligibilityPlan(matrix) {
  const planFor = (customerSeedKey) =>
    matrix.orders
      .filter(
        (order) =>
          order.customerSeedKey === customerSeedKey &&
          order.orderStatus === ORDER_STATUSES.DELIVERED,
      )
      .flatMap((order) =>
        order.items.map((item) => ({
          customerId: order.customerId,
          orderId: order._id,
          paymentId: order.paymentId,
          itemId: item._id,
          productId: item.productId,
        })),
      );

  return Object.freeze({
    reviews: Object.freeze(planFor('user:reviews')),
    ratings: Object.freeze(planFor('user:ratings')),
  });
}

export function buildRefundEligibilityPlan(matrix) {
  const delivered = matrix.orders.filter(
    (order) =>
      order.customerSeedKey === 'user:refunds' &&
      order.orderStatus === ORDER_STATUSES.DELIVERED,
  );
  const cancelled = matrix.orders.filter(
    (order) => order.orderStatus === ORDER_STATUSES.CANCELLED,
  );
  const customerRequest = delivered
    .flatMap((order) =>
      order.items.map((item) => ({
        customerId: order.customerId,
        orderId: order._id,
        paymentId: order.paymentId,
        itemIds: Object.freeze([item._id]),
      })),
    )
    .slice(0, 6);
  const orderCancellation = cancelled.map((order) => ({
    customerId: order.customerId,
    orderId: order._id,
    paymentId: order.paymentId,
  }));
  const systemCompensation = matrix.payments
    .filter((payment) => payment.kind === 'system_compensation')
    .map((payment) => ({
      customerId: payment.customerId,
      paymentId: payment._id,
    }));

  return Object.freeze({
    customerRequest: Object.freeze(customerRequest),
    orderCancellation: Object.freeze(orderCancellation),
    systemCompensation: Object.freeze(systemCompensation),
  });
}

export function buildHistoricalInventoryEffectPlan({
  matrix,
  inventoryPositions,
  registry,
  lowStockThreshold,
  productDefinitions,
}) {
  const inventoryByLine = new Map(
    inventoryPositions.map((position) => [
      `${idString(position.productId)}:${idString(position.variantId)}`,
      position,
    ]),
  );
  const effects = [];

  for (const order of matrix.orders) {
    for (const item of order.items) {
      const inventory = inventoryByLine.get(
        `${idString(item.productId)}:${idString(item.variantId)}`,
      );

      assertMatrix(
        inventory,
        'DEMO_COMMERCE_INVENTORY_POSITION_MISSING',
        `Order ${order.seedKey} has no exact Inventory position.`,
      );
      effects.push({
        inventoryId: inventory._id,
        reason: INVENTORY_ADJUSTMENT_REASONS.ORDER_PURCHASE,
        quantityChange: -item.quantity,
        sourceType: 'order',
        sourceId: order._id,
        orderItemId: item._id,
      });

      if (order.orderStatus === ORDER_STATUSES.CANCELLED) {
        effects.push({
          inventoryId: inventory._id,
          reason: INVENTORY_ADJUSTMENT_REASONS.ORDER_CANCELLATION,
          quantityChange: item.quantity,
          sourceType: 'order',
          sourceId: order._id,
          orderItemId: item._id,
        });
      }
    }
  }

  const deltaByInventory = new Map();

  for (const effect of effects) {
    const key = idString(effect.inventoryId);
    deltaByInventory.set(
      key,
      (deltaByInventory.get(key) || 0) + effect.quantityChange,
    );
  }

  const projection = inventoryPositions.map((position) => ({
    inventoryId: position._id,
    productSeedKey: position.productSeedKey,
    currentQuantity: position.quantity,
    quantityChange: deltaByInventory.get(idString(position._id)) || 0,
    projectedQuantity:
      position.quantity + (deltaByInventory.get(idString(position._id)) || 0),
  }));
  const selectedInventoryIds = new Set(
    matrix.pool.map((entry) => idString(entry.inventory._id)),
  );
  const selectedProjection = projection.filter((position) =>
    selectedInventoryIds.has(idString(position.inventoryId)),
  );

  assertMatrix(
    selectedProjection.length === 14 &&
      projection.every((position) => position.projectedQuantity >= 0) &&
      projection
        .filter((position) => position.quantityChange !== 0)
        .every((position) =>
          selectedInventoryIds.has(idString(position.inventoryId)),
        ) &&
      selectedProjection.every(
        (position) => position.projectedQuantity > lowStockThreshold,
      ),
    'DEMO_COMMERCE_INVENTORY_PROJECTION_UNSAFE',
    'Historical commerce effects would make a selected Inventory position unsafe.',
  );

  const productsByKey = new Map(
    productDefinitions.map((product) => [product.seedKey, product]),
  );
  let validLiveLines = 0;
  let staleSupportLines = 0;

  for (const cart of CART_DEFINITIONS) {
    for (const item of cart.items) {
      const product = productsByKey.get(item.productSeedKey);
      const variantId = item.variantSeedKey
        ? registry.idFor(item.variantSeedKey)
        : null;
      const position = inventoryPositions.find(
        (candidate) =>
          candidate.productSeedKey === item.productSeedKey &&
          (variantId
            ? idString(candidate.variantId) === idString(variantId)
            : candidate.variantId === undefined),
      );
      const projected = projection.find(
        (candidate) => idString(candidate.inventoryId) === idString(position?._id),
      );

      assertMatrix(
        product && position && projected,
        'DEMO_COMMERCE_LIVE_CART_POSITION_MISSING',
        `Live Cart line ${item.seedKey} has no projection.`,
      );
      const variant = variantId
        ? product.variants.id
          ? product.variants.id(variantId)
          : product.variants.find(
              (candidate) => idString(candidate._id) === idString(variantId),
            )
        : null;

      if (cart.customerSeedKey === 'user:support') {
        assertMatrix(
          variant?.isActive === false &&
            projected.projectedQuantity > lowStockThreshold,
          'DEMO_COMMERCE_SUPPORT_CART_STATE_CHANGED',
          'Support Cart must remain stale only because its Variant is inactive.',
        );
        staleSupportLines += 1;
      } else {
        assertMatrix(
          product.isActive === true &&
            (variantId ? variant?.isActive === true : product.variants.length === 0) &&
            projected.projectedQuantity >= item.quantity,
          'DEMO_COMMERCE_LIVE_CART_STOCK_UNSAFE',
          `Historical effects would invalidate live Cart line ${item.seedKey}.`,
        );
        validLiveLines += 1;
      }
    }
  }

  return Object.freeze({
    effects: Object.freeze(effects),
    projection: Object.freeze(projection),
    liveCartSafety: Object.freeze({ validLiveLines, staleSupportLines }),
  });
}

function paymentModelPayload(payment) {
  return {
    _id: payment._id,
    customerId: payment.customerId,
    provider: payment.provider,
    providerOrderId: payment.providerOrderId,
    ...(payment.providerPaymentId
      ? { providerPaymentId: payment.providerPaymentId }
      : {}),
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    checkoutSnapshot: payment.checkoutSnapshot,
    ...(payment.verifiedAt ? { verifiedAt: payment.verifiedAt } : {}),
    ...(payment.commerceResolution
      ? { commerceResolution: payment.commerceResolution }
      : {}),
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

function orderModelPayload(order) {
  return {
    _id: order._id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    paymentId: order.paymentId,
    items: order.items,
    shippingAddress: order.shippingAddress,
    coupon: order.coupon,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    totalAmount: order.totalAmount,
    orderStatus: order.orderStatus,
    placedAt: order.placedAt,
    cartReconciledAt: order.cartReconciledAt,
    ...(order.cancelledAt ? { cancelledAt: order.cancelledAt } : {}),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export function buildHistoricalPaymentDefinitions(matrix) {
  return matrix.payments;
}

export function buildHistoricalOrderDefinitions(matrix) {
  return matrix.orders;
}

export function buildHistoricalCommerceScenarioMatrix({
  registry,
  clock,
  productDefinitions,
  categories,
  users,
  coupons,
  inventoryPositions,
  lowStockThreshold,
}) {
  const pool = buildPool({
    productDefinitions,
    categories,
    inventoryPositions,
  });
  const usersByKey = new Map(users.map((user) => [user.seedKey, user]));
  const couponsByKey = new Map(
    coupons.map((coupon) => [coupon.seedKey, coupon]),
  );
  const orderBacked = buildOrderBackedDefinitions({
    registry,
    clock,
    pool,
    usersByKey,
    couponsByKey,
  });
  const nonOrderPayments = buildNonOrderPayments({
    registry,
    clock,
    pool,
    usersByKey,
  });
  const matrix = {
    pool,
    payments: [...orderBacked.payments, ...nonOrderPayments],
    orders: orderBacked.orders,
    couponCounters: orderBacked.couponCounters,
  };

  matrix.reviewEligibility = buildReviewEligibilityPlan(matrix);
  matrix.refundEligibility = buildRefundEligibilityPlan(matrix);
  matrix.inventoryEffectPlan = buildHistoricalInventoryEffectPlan({
    matrix,
    inventoryPositions,
    registry,
    lowStockThreshold,
    productDefinitions,
  });

  return matrix;
}

export async function validateHistoricalCommerceScenarioMatrix(input) {
  const matrix = buildHistoricalCommerceScenarioMatrix(input);
  const { payments, orders, pool } = matrix;
  const orderPayments = payments.filter((payment) => payment.kind === 'order');
  const abandoned = payments.filter((payment) => payment.kind === 'abandoned');
  const compensation = payments.filter(
    (payment) => payment.kind === 'system_compensation',
  );
  const orderItems = orders.flatMap((order) => order.items);
  const paymentItems = payments.flatMap(
    (payment) => payment.checkoutSnapshot.items,
  );
  const paymentItemIds = paymentItems.map((item) => idString(item._id));
  const orderItemIds = orderItems.map((item) => idString(item._id));

  assertMatrix(
    payments.length === 46 &&
      orders.length === 42 &&
      orderPayments.length === 42 &&
      abandoned.length === 2 &&
      compensation.length === 2 &&
      orderItems.length === 49 &&
      paymentItems.length === 53,
    'DEMO_COMMERCE_MATRIX_COUNTS_INVALID',
    'Historical commerce must define 46 Payments, 42 Orders, and 53 snapshot items.',
  );
  assertMatrix(
    new Set(paymentItemIds).size === 53 &&
      new Set(orderItemIds).size === 49 &&
      orderItemIds.every((itemId) => paymentItemIds.includes(itemId)) &&
      input.registry.counts.payments === 46 &&
      input.registry.counts.orders === 42 &&
      input.registry.counts.commerceItems === 53,
    'DEMO_COMMERCE_REGISTRY_IDENTITIES_INVALID',
    'Payment, Order, and commerce-item registry identities are incomplete.',
  );

  const customerCounts = Object.fromEntries(
    Object.keys(HISTORICAL_CUSTOMER_ORDER_COUNTS).map((key) => [
      key,
      orders.filter((order) => order.customerSeedKey === key).length,
    ]),
  );
  const statusCounts = Object.fromEntries(
    Object.keys(HISTORICAL_STATUS_COUNTS).map((status) => [
      status,
      orders.filter((order) => order.orderStatus === status).length,
    ]),
  );
  const dateBuckets = Object.fromEntries(
    ['current_7_days', 'days_8_to_30', 'earlier_current_year'].map((bucket) => [
      bucket,
      orders.filter((order) => order.dateBucket === bucket).length,
    ]),
  );

  assertMatrix(
    isDeepStrictEqual(customerCounts, HISTORICAL_CUSTOMER_ORDER_COUNTS) &&
      isDeepStrictEqual(statusCounts, HISTORICAL_STATUS_COUNTS) &&
      isDeepStrictEqual(dateBuckets, {
        current_7_days: 12,
        days_8_to_30: 12,
        earlier_current_year: 18,
      }),
    'DEMO_COMMERCE_DISTRIBUTION_INVALID',
    'Customer, status, or date-bucket distribution differs from the lock.',
  );

  const anchor = input.clock.anchorTime;
  const anchorYear = Number(input.clock.anchorDate.slice(0, 4));

  for (const order of orders) {
    const payment = orderPayments.find(
      (candidate) => idString(candidate._id) === idString(order.paymentId),
    );

    assertMatrix(
      payment &&
        payment.createdAt < payment.verifiedAt &&
        payment.verifiedAt < order.placedAt &&
        order.placedAt < order.cartReconciledAt &&
        order.cartReconciledAt <= order.updatedAt &&
        order.updatedAt <= anchor &&
        order.placedAt.getUTCFullYear() === anchorYear &&
        (order.orderStatus === ORDER_STATUSES.CANCELLED
          ? order.cancelledAt > order.placedAt
          : order.cancelledAt === undefined),
      'DEMO_COMMERCE_TIMELINE_INVALID',
      `Historical timeline is invalid for ${order.seedKey}.`,
    );
    assertMatrix(
      idString(payment.customerId) === idString(order.customerId) &&
        isDeepStrictEqual(
          comparableSnapshot(payment.checkoutSnapshot.items),
          comparableSnapshot(order.items),
        ) &&
        isDeepStrictEqual(
          comparableSnapshot(payment.checkoutSnapshot.shippingAddress),
          comparableSnapshot(order.shippingAddress),
        ) &&
        isDeepStrictEqual(
          comparableSnapshot(payment.checkoutSnapshot.coupon),
          comparableSnapshot(order.coupon),
        ) &&
        payment.amount === order.totalAmount &&
        payment.checkoutSnapshot.subtotal === order.subtotal &&
        payment.checkoutSnapshot.discountAmount === order.discountAmount,
      'DEMO_COMMERCE_PAYMENT_ORDER_SNAPSHOT_MISMATCH',
      `Payment and Order snapshots differ for ${order.seedKey}.`,
    );
  }

  const sportCounts = Object.fromEntries(
    [...new Set(pool.map((entry) => entry.product.sport))].map((sport) => [
      sport,
      pool.filter((entry) => entry.product.sport === sport).length,
    ]),
  );

  assertMatrix(
    pool.length === 14 &&
      Object.keys(sportCounts).length === 7 &&
      Object.values(sportCounts).every((count) => count === 2) &&
      new Set(pool.map((entry) => idString(entry.product._id))).size === 14,
    'DEMO_COMMERCE_POOL_DISTRIBUTION_INVALID',
    'Historical commerce pool must contain two unique Products per sport.',
  );

  for (const item of paymentItems) {
    assertMatrix(
      item.quantity === 1 &&
        item.lineTotal ===
          (item.unitPrice - item.itemDiscount) * item.quantity &&
        item.productName.length > 0 &&
        item.categoryName.length > 0,
      'DEMO_COMMERCE_ITEM_ARITHMETIC_INVALID',
      `Commerce item ${idString(item._id)} has invalid immutable pricing.`,
    );
  }

  assertMatrix(
    matrix.couponCounters.get('coupon:USEDUP250') === 4 &&
      matrix.couponCounters.get('coupon:LIMITED5') === 3 &&
      payments.filter((payment) => payment.checkoutSnapshot.coupon).length === 7,
    'DEMO_COMMERCE_COUPON_REDEMPTIONS_INVALID',
    'Historical Coupon usage must be exactly USEDUP250=4 and LIMITED5=3.',
  );

  const reviewProductIds = matrix.reviewEligibility.reviews.map((entry) =>
    idString(entry.productId),
  );
  const ratingProductIds = matrix.reviewEligibility.ratings.map((entry) =>
    idString(entry.productId),
  );

  assertMatrix(
    reviewProductIds.length === 7 &&
      ratingProductIds.length === 7 &&
      new Set(reviewProductIds).size === 7 &&
      new Set(ratingProductIds).size === 7 &&
      reviewProductIds.every((id) => !ratingProductIds.includes(id)),
    'DEMO_COMMERCE_REVIEW_ELIGIBILITY_INVALID',
    'Review eligibility must reserve two disjoint seven-Product sets.',
  );
  assertMatrix(
    matrix.refundEligibility.customerRequest.length === 6 &&
      matrix.refundEligibility.orderCancellation.length === 4 &&
      matrix.refundEligibility.systemCompensation.length === 2,
    'DEMO_COMMERCE_REFUND_ELIGIBILITY_INVALID',
    'Refund eligibility must reserve exact 6/4/2 future scopes.',
  );

  const purchases = matrix.inventoryEffectPlan.effects.filter(
    (effect) => effect.reason === INVENTORY_ADJUSTMENT_REASONS.ORDER_PURCHASE,
  );
  const cancellations = matrix.inventoryEffectPlan.effects.filter(
    (effect) => effect.reason === INVENTORY_ADJUSTMENT_REASONS.ORDER_CANCELLATION,
  );

  assertMatrix(
    purchases.length === 49 &&
      cancellations.length === 4 &&
      purchases.reduce((total, effect) => total + effect.quantityChange, 0) ===
        -49 &&
      cancellations.reduce(
        (total, effect) => total + effect.quantityChange,
        0,
      ) === 4,
    'DEMO_COMMERCE_INVENTORY_EFFECT_COUNTS_INVALID',
    'Inventory projection must contain 49 purchases and four cancellations.',
  );

  const recognizedOrders = orders.filter(
    (order) => order.orderStatus !== ORDER_STATUSES.CANCELLED,
  );
  const recognizedSports = new Set(
    recognizedOrders.flatMap((order) => order.items.map((item) => item.sport)),
  );
  const productSales = new Map();

  for (const item of recognizedOrders.flatMap((order) => order.items)) {
    const key = idString(item.productId);
    productSales.set(key, (productSales.get(key) || 0) + item.quantity);
  }

  assertMatrix(
    recognizedOrders.length === 38 &&
      recognizedSports.size === 7 &&
      recognizedOrders.every((order) => order.totalAmount > 0) &&
      Math.max(...productSales.values()) > 1 &&
      input.productDefinitions.length - productSales.size >= 28,
    'DEMO_COMMERCE_ANALYTICS_COVERAGE_INVALID',
    'Historical commerce matrix does not provide the locked analytics coverage.',
  );

  for (const payment of payments) {
    await new Payment(paymentModelPayload(payment)).validate();
  }

  for (const order of orders) {
    await new Order(orderModelPayload(order)).validate();
  }

  return {
    ...matrix,
    counts: Object.freeze({
      payments: 46,
      orders: 42,
      orderItems: 49,
      checkoutSnapshotItems: 53,
      orderBackedPayments: 42,
      abandonedPayments: 2,
      compensationPayments: 2,
      recognizedOrders: 38,
      modelValidatedPayments: 46,
      modelValidatedOrders: 42,
    }),
    distributions: Object.freeze({ customerCounts, statusCounts, dateBuckets }),
    analytics: Object.freeze({
      recognizedSports: recognizedSports.size,
      recognizedRevenue: recognizedOrders.reduce(
        (total, order) => total + order.totalAmount,
        0,
      ),
      repeatedTopSellerCount: Math.max(...productSales.values()),
      zeroSaleCatalogProducts: input.productDefinitions.length - productSales.size,
    }),
  };
}

export async function preflightHistoricalCommerceCollisions(matrix) {
  const providerPaymentIds = matrix.payments
    .map((payment) => payment.providerPaymentId)
    .filter(Boolean);
  const paymentCollisions = await Payment.find({
    $or: [
      { _id: { $in: matrix.payments.map((payment) => payment._id) } },
      {
        providerOrderId: {
          $in: matrix.payments.map((payment) => payment.providerOrderId),
        },
      },
      { providerPaymentId: { $in: providerPaymentIds } },
    ],
  })
    .select('_id providerOrderId providerPaymentId')
    .lean();
  const orderCollisions = await Order.find({
    $or: [
      { _id: { $in: matrix.orders.map((order) => order._id) } },
      { orderNumber: { $in: matrix.orders.map((order) => order.orderNumber) } },
      { paymentId: { $in: matrix.orders.map((order) => order.paymentId) } },
    ],
  })
    .select('_id orderNumber paymentId')
    .lean();

  assertMatrix(
    paymentCollisions.length === 0 && orderCollisions.length === 0,
    'DEMO_COMMERCE_FUTURE_IDENTITY_COLLISION',
    'A future deterministic Payment or Order identity is already occupied.',
  );

  return Object.freeze({ paymentsPresent: 0, ordersPresent: 0 });
}
