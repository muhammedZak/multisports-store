import { createHash } from 'node:crypto';

import mongoose from 'mongoose';

import { SeedValidationError } from './seed.utils.js';

const REGISTRY_NAMESPACE = 'multisports-store:demo-seed:v1';

export const DEMO_USER_IDENTITIES = Object.freeze([
  { key: 'user:admin:01', email: 'admin.demo@multisports-store.test' },
  ...Array.from({ length: 7 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');

    return Object.freeze({
      key: `user:customer:${number}`,
      email: `customer${number}.demo@multisports-store.test`,
    });
  }),
]);

export const DEMO_COUPON_IDENTITIES = Object.freeze([
  'WELCOME10',
  'SPORTS15',
  'TRAINING20',
  'RUNNER500',
  'COURT10',
  'FITNESS15',
  'FREESHIP',
  'DEMO25',
].map((code) => Object.freeze({ key: `coupon:${code}`, code })));

function numberedKeys(namespace, count) {
  return Array.from(
    { length: count },
    (_, index) => `${namespace}:${String(index + 1).padStart(2, '0')}`,
  );
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
  const categoryKeys = [
    ...new Set(
      manifest.products.map((product) => `category:${product.categoryKey}`),
    ),
  ].sort();
  const customerKeys = DEMO_USER_IDENTITIES.filter((identity) =>
    identity.key.startsWith('user:customer:'),
  ).map((identity) => identity.key);

  const keysByEntity = Object.freeze({
    users: DEMO_USER_IDENTITIES.map((identity) => identity.key),
    categories: categoryKeys,
    products: productKeys,
    inventory: productKeys.map((key) => `inventory:${key}`),
    inventoryAdjustments: productKeys.map(
      (key) => `inventory-adjustment:${key}:opening`,
    ),
    coupons: DEMO_COUPON_IDENTITIES.map((identity) => identity.key),
    carts: customerKeys.map((key) => `cart:${key}`),
    payments: numberedKeys('payment:scenario', 8),
    orders: numberedKeys('order:scenario', 8),
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
