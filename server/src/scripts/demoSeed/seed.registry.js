import { createHash } from 'node:crypto';

import mongoose from 'mongoose';

import { SeedValidationError } from './seed.utils.js';

const REGISTRY_NAMESPACE = 'multisports-store:demo-seed:v1';

export const DEMO_USER_IDENTITIES = Object.freeze([
  Object.freeze({
    key: 'user:admin',
    email: 'admin.demo@example.test',
    role: 'admin',
  }),
  Object.freeze({
    key: 'user:fresh',
    email: 'fresh.demo@example.test',
    role: 'customer',
  }),
  Object.freeze({
    key: 'user:checkout',
    email: 'checkout.demo@example.test',
    role: 'customer',
  }),
  Object.freeze({
    key: 'user:orders',
    email: 'orders.demo@example.test',
    role: 'customer',
  }),
  Object.freeze({
    key: 'user:reviews',
    email: 'reviews.demo@example.test',
    role: 'customer',
  }),
  Object.freeze({
    key: 'user:ratings',
    email: 'ratings.demo@example.test',
    role: 'customer',
  }),
  Object.freeze({
    key: 'user:refunds',
    email: 'refunds.demo@example.test',
    role: 'customer',
  }),
  Object.freeze({
    key: 'user:support',
    email: 'support.demo@example.test',
    role: 'customer',
  }),
]);

export const DEMO_ADDRESS_KEYS = Object.freeze([
  'address:checkout:primary',
  'address:checkout:secondary',
  'address:orders:primary',
  'address:orders:secondary',
  'address:reviews:primary',
  'address:ratings:primary',
  'address:refunds:primary',
  'address:support:primary',
]);

export const DEMO_COUPON_IDENTITIES = Object.freeze([
  'DEMO10',
  'SAVE500',
  'MAX20',
  'INACTIVE15',
  'EXPIRED12',
  'NEXTWEEK15',
  'USEDUP250',
  'LIMITED5',
].map((code) => Object.freeze({ key: `coupon:${code}`, code })));

function numberedKeys(namespace, count) {
  return Array.from(
    { length: count },
    (_, index) => `${namespace}:${String(index + 1).padStart(2, '0')}`,
  );
}

function commerceItemKeys() {
  const twoItemOrderOrdinals = new Set([15, 23, 31, 32, 33, 34, 35]);
  const orderItems = Array.from({ length: 42 }, (_, index) => {
    const ordinal = index + 1;
    const namespace = `commerce-item:order:${String(ordinal).padStart(2, '0')}`;

    return numberedKeys(namespace, twoItemOrderOrdinals.has(ordinal) ? 2 : 1);
  }).flat();

  return [
    ...orderItems,
    'commerce-item:abandoned:01:01',
    'commerce-item:abandoned:02:01',
    'commerce-item:system-compensation:01:01',
    'commerce-item:system-compensation:02:01',
  ];
}

const LOW_STOCK_ACTIVE_SIMPLE_ORDINALS = new Set([3, 7, 11, 15, 19]);
const OUT_OF_STOCK_ACTIVE_SIMPLE_ORDINALS = new Set([4, 8, 12, 16]);
const RESTOCK_IN_STOCK_ORDINALS = new Set([2, 8, 14, 20, 27, 34, 41, 48]);
const MANUAL_IN_STOCK_ORDINALS = new Set([5, 11, 17, 25, 33, 45]);
const HISTORICAL_OUT_OF_STOCK_ORDINALS = new Set([1, 6, 11, 16, 21]);

export function buildInventoryRegistryPlan(manifest) {
  let activeSimpleOrdinal = 0;
  let inactiveSimpleOrdinal = 0;
  let variantProductOrdinal = 0;
  const positions = [];

  for (const product of manifest.products) {
    if (product.productType === 'simple') {
      const simpleOrdinal = product.active
        ? (activeSimpleOrdinal += 1)
        : (inactiveSimpleOrdinal += 1);
      let stockState = 'in_stock';

      if (
        product.active &&
        LOW_STOCK_ACTIVE_SIMPLE_ORDINALS.has(simpleOrdinal)
      ) {
        stockState = 'low_stock';
      } else if (
        product.active &&
        OUT_OF_STOCK_ACTIVE_SIMPLE_ORDINALS.has(simpleOrdinal)
      ) {
        stockState = 'out_of_stock';
      }

      positions.push({
        productSeedKey: product.seedKey,
        productType: product.productType,
        productActive: product.active,
        simpleOrdinal,
        stockState,
        inventoryKey: `inventory:${product.seedKey}:simple`,
      });
      continue;
    }

    variantProductOrdinal += 1;

    for (let variantOrdinal = 1; variantOrdinal <= 4; variantOrdinal += 1) {
      positions.push({
        productSeedKey: product.seedKey,
        productType: product.productType,
        productActive: product.active,
        variantProductOrdinal,
        variantOrdinal,
        stockState:
          variantOrdinal === 2
            ? 'low_stock'
            : variantOrdinal === 3
              ? 'out_of_stock'
              : 'in_stock',
        inventoryKey:
          `inventory:${product.seedKey}:variant:` +
          String(variantOrdinal).padStart(2, '0'),
      });
    }
  }

  let inStockOrdinal = 0;
  let outOfStockOrdinal = 0;

  const plannedPositions = positions.map((position) => {
    let historyType = 'initial_only';

    if (position.stockState === 'in_stock') {
      inStockOrdinal += 1;

      if (RESTOCK_IN_STOCK_ORDINALS.has(inStockOrdinal)) {
        historyType = 'restock';
      } else if (MANUAL_IN_STOCK_ORDINALS.has(inStockOrdinal)) {
        historyType = 'manual_correction';
      }
    } else if (position.stockState === 'out_of_stock') {
      outOfStockOrdinal += 1;
      historyType = HISTORICAL_OUT_OF_STOCK_ORDINALS.has(outOfStockOrdinal)
        ? 'historical_zero'
        : 'zero_no_history';
    }

    const adjustmentCount =
      historyType === 'zero_no_history'
        ? 0
        : ['restock', 'manual_correction', 'historical_zero'].includes(
              historyType,
            )
          ? 2
          : 1;

    return Object.freeze({
      ...position,
      ...(position.stockState === 'in_stock' ? { inStockOrdinal } : {}),
      ...(position.stockState === 'out_of_stock'
        ? { outOfStockOrdinal }
        : {}),
      historyType,
      adjustmentKeys: Object.freeze(
        numberedKeys(
          `inventory-adjustment:${position.inventoryKey}`,
          adjustmentCount,
        ),
      ),
    });
  });

  if (
    plannedPositions.length !== 105 ||
    plannedPositions.filter((position) => position.stockState === 'in_stock')
      .length !== 54 ||
    plannedPositions.filter((position) => position.stockState === 'low_stock')
      .length !== 26 ||
    plannedPositions.filter(
      (position) => position.stockState === 'out_of_stock',
    ).length !== 25 ||
    plannedPositions.flatMap((position) => position.adjustmentKeys).length !==
      104
  ) {
    throw new SeedValidationError(
      'DEMO_INVENTORY_REGISTRY_PLAN_INVALID',
      'The deterministic Inventory registry plan has unexpected totals.',
    );
  }

  return Object.freeze(plannedPositions);
}

export function deterministicObjectId(seedKey) {
  if (typeof seedKey !== 'string' || seedKey.trim().length === 0) {
    throw new TypeError('A non-empty seed key is required.');
  }

  const hex = createHash('sha256')
    .update(`${REGISTRY_NAMESPACE}:${seedKey}`)
    .digest('hex')
    .slice(0, 24);

  return new mongoose.Types.ObjectId(hex);
}

export function createSeedRegistry(manifest) {
  const productKeys = manifest.products.map((product) => product.seedKey);
  const variantProductKeys = manifest.products
    .filter((product) => product.productType === 'variant')
    .map((product) => product.seedKey);
  const categoryKeys = [
    ...new Set(
      manifest.products.map(
        (product) =>
          `category:${product.sport}:${product.categoryKey.slice(
            product.sport.length + 1,
          )}`,
      ),
    ),
  ].sort();
  const inventoryPlan = buildInventoryRegistryPlan(manifest);

  const keysByEntity = Object.freeze({
    users: DEMO_USER_IDENTITIES.map((identity) => identity.key),
    addresses: DEMO_ADDRESS_KEYS,
    categories: categoryKeys,
    products: productKeys,
    variants: variantProductKeys.flatMap((key) =>
      numberedKeys(`variant:${key}`, 4),
    ),
    productImages: productKeys.flatMap((key) =>
      numberedKeys(`product-image:${key}`, 2),
    ),
    inventory: inventoryPlan.map((position) => position.inventoryKey),
    inventoryAdjustments: inventoryPlan.flatMap(
      (position) => position.adjustmentKeys,
    ),
    coupons: DEMO_COUPON_IDENTITIES.map((identity) => identity.key),
    carts: Object.freeze([
      'cart:user:checkout',
      'cart:user:orders',
      'cart:user:support',
    ]),
    cartItems: Object.freeze([
      'cart-item:user:checkout:01',
      'cart-item:user:checkout:02',
      'cart-item:user:checkout:03',
      'cart-item:user:orders:01',
      'cart-item:user:orders:02',
      'cart-item:user:support:01',
    ]),
    commerceItems: commerceItemKeys(),
    payments: [
      ...numberedKeys('payment:order', 42),
      ...numberedKeys('payment:abandoned', 2),
      ...numberedKeys('payment:system-compensation', 2),
    ],
    orders: numberedKeys('order:historical', 42),
    refunds: numberedKeys('refund:scenario', 4),
    reviews: numberedKeys('review:scenario', 8),
    notifications: numberedKeys('notification:scenario', 12),
    supportConversations: numberedKeys('support-conversation:scenario', 4),
    supportMessages: numberedKeys('support-message:scenario', 8),
  });

  const entries = Object.entries(keysByEntity).flatMap(([entity, keys]) =>
    keys.map((key) => {
      const id = deterministicObjectId(key);

      return Object.freeze({ entity, key, id, idString: id.toHexString() });
    }),
  );

  const keySet = new Set(entries.map((entry) => entry.key));
  const idSet = new Set(entries.map((entry) => entry.idString));

  if (keySet.size !== entries.length) {
    throw new SeedValidationError(
      'DEMO_SEED_REGISTRY_DUPLICATE_KEY',
      'The deterministic seed registry contains duplicate keys.',
    );
  }

  if (idSet.size !== entries.length) {
    throw new SeedValidationError(
      'DEMO_SEED_REGISTRY_COLLISION',
      'The deterministic seed registry contains an ObjectId collision.',
    );
  }

  if (entries.some((entry) => !mongoose.isObjectIdOrHexString(entry.idString))) {
    throw new SeedValidationError(
      'DEMO_SEED_REGISTRY_INVALID_ID',
      'The deterministic seed registry produced an invalid ObjectId.',
    );
  }

  const byKey = new Map(entries.map((entry) => [entry.key, entry]));

  return Object.freeze({
    namespace: REGISTRY_NAMESPACE,
    keysByEntity,
    entries: Object.freeze(entries),
    counts: Object.freeze(
      Object.fromEntries(
        Object.entries(keysByEntity).map(([entity, keys]) => [
          entity,
          keys.length,
        ]),
      ),
    ),
    idFor(key) {
      const entry = byKey.get(key);

      if (!entry) {
        throw new SeedValidationError(
          'DEMO_SEED_REGISTRY_KEY_UNKNOWN',
          `Seed key "${key}" is not registered.`,
        );
      }

      return entry.id;
    },
  });
}
