import { isDeepStrictEqual } from 'node:util';

import { AppError } from '../../utils/AppError.js';
import { Cart } from '../../modules/cart/cart.model.js';
import {
  resolveCartItemForAdd,
  resolveCustomerCart,
} from '../../modules/cart/cart.service.js';
import { resolveCheckoutForCustomer } from '../../modules/checkout/checkout.service.js';
import { Product } from '../../modules/catalog/product.model.js';
import { Coupon } from '../../modules/coupon/coupon.model.js';
import { resolveCouponByIdForSubtotal } from '../../modules/coupon/coupon.service.js';
import { Inventory } from '../../modules/inventory/inventory.model.js';
import { InventoryAdjustment } from '../../modules/inventory/inventoryAdjustment.model.js';
import { User } from '../../modules/users/user.model.js';
import { DEMO_USER_IDENTITIES, deterministicObjectId } from './seed.registry.js';
import {
  SeedDriftError,
  SeedValidationError,
  withSeedTransaction,
} from './seed.utils.js';

export const CART_CLASSIFICATIONS = Object.freeze({
  MISSING: 'MISSING',
  EXACT: 'EXACT',
  CUSTOMER_CONFLICT: 'CUSTOMER_CONFLICT',
  ID_CONFLICT: 'ID_CONFLICT',
  DRIFT: 'DRIFT',
});

export const LEGACY_CART_KEYS = Object.freeze([
  'cart:user:fresh',
  'cart:user:reviews',
  'cart:user:ratings',
  'cart:user:refunds',
]);

export const CART_FREE_USER_KEYS = Object.freeze([
  'user:admin',
  'user:fresh',
  'user:reviews',
  'user:ratings',
  'user:refunds',
]);

export const CART_DEFINITIONS = Object.freeze([
  Object.freeze({
    seedKey: 'cart:user:checkout',
    customerSeedKey: 'user:checkout',
    timestampDaysAgo: 1,
    appliedCouponSeedKey: 'coupon:DEMO10',
    items: Object.freeze([
      Object.freeze({
        seedKey: 'cart-item:user:checkout:01',
        productSeedKey: 'product:football:matchcore-training-football',
        variantSeedKey: null,
        quantity: 1,
      }),
      Object.freeze({
        seedKey: 'cart-item:user:checkout:02',
        productSeedKey: 'product:football:stride-control-boots',
        variantSeedKey:
          'variant:product:football:stride-control-boots:01',
        quantity: 1,
      }),
      Object.freeze({
        seedKey: 'cart-item:user:checkout:03',
        productSeedKey: 'product:football:pivot-agility-cones',
        variantSeedKey: null,
        quantity: 2,
      }),
    ]),
  }),
  Object.freeze({
    seedKey: 'cart:user:orders',
    customerSeedKey: 'user:orders',
    timestampDaysAgo: 3,
    appliedCouponSeedKey: null,
    items: Object.freeze([
      Object.freeze({
        seedKey: 'cart-item:user:orders:01',
        productSeedKey: 'product:cricket:willowcraft-english-bat',
        variantSeedKey:
          'variant:product:cricket:willowcraft-english-bat:01',
        quantity: 1,
      }),
      Object.freeze({
        seedKey: 'cart-item:user:orders:02',
        productSeedKey: 'product:tennis:rallypoint-control-racquet',
        variantSeedKey:
          'variant:product:tennis:rallypoint-control-racquet:01',
        quantity: 1,
      }),
    ]),
  }),
  Object.freeze({
    seedKey: 'cart:user:support',
    customerSeedKey: 'user:support',
    timestampDaysAgo: 2,
    appliedCouponSeedKey: null,
    items: Object.freeze([
      Object.freeze({
        seedKey: 'cart-item:user:support:01',
        productSeedKey: 'product:running:temporun-daily-trainers',
        variantSeedKey:
          'variant:product:running:temporun-daily-trainers:04',
        quantity: 1,
      }),
    ]),
  }),
]);

const PRODUCT_REQUIREMENTS = Object.freeze({
  'product:football:matchcore-training-football': Object.freeze({
    name: 'MatchCore Training Football',
    variantSeedKey: null,
    variantActive: null,
  }),
  'product:football:stride-control-boots': Object.freeze({
    name: 'Stride Control Football Boots',
    variantSeedKey: 'variant:product:football:stride-control-boots:01',
    variantActive: true,
  }),
  'product:football:pivot-agility-cones': Object.freeze({
    name: 'Pivot Agility Cone Set',
    variantSeedKey: null,
    variantActive: null,
  }),
  'product:cricket:willowcraft-english-bat': Object.freeze({
    name: 'WillowCraft English Cricket Bat',
    variantSeedKey: 'variant:product:cricket:willowcraft-english-bat:01',
    variantActive: true,
  }),
  'product:tennis:rallypoint-control-racquet': Object.freeze({
    name: 'RallyPoint Control Tennis Racquet',
    variantSeedKey: 'variant:product:tennis:rallypoint-control-racquet:01',
    variantActive: true,
  }),
  'product:running:temporun-daily-trainers': Object.freeze({
    name: 'TempoRun Daily Trainers',
    variantSeedKey: 'variant:product:running:temporun-daily-trainers:04',
    variantActive: false,
  }),
});

const EXPECTED_PRICING = Object.freeze({
  checkout: Object.freeze({
    subtotal: 629610,
    discountAmount: 62961,
    totalAmount: 566649,
  }),
  orders: Object.freeze({
    subtotal: 1499800,
    discountAmount: 0,
    totalAmount: 1499800,
  }),
});

function idString(value) {
  return value?.toString();
}

function dateString(value) {
  return value ? new Date(value).toISOString() : null;
}

function assertSeed(condition, code, message) {
  if (!condition) {
    throw new SeedValidationError(code, message);
  }
}

function comparableCart(value) {
  const source =
    typeof value?.toObject === 'function' ? value.toObject() : value;

  return {
    _id: idString(source?._id),
    customerId: idString(source?.customerId),
    items: (source?.items || []).map((item) => ({
      _id: idString(item._id),
      productId: idString(item.productId),
      variantId: item.variantId ? idString(item.variantId) : null,
      quantity: item.quantity,
    })),
    appliedCouponId: source?.appliedCouponId
      ? idString(source.appliedCouponId)
      : null,
    createdAt: dateString(source?.createdAt),
    updatedAt: dateString(source?.updatedAt),
  };
}

function cartPayload(cart) {
  return {
    _id: cart._id,
    customerId: cart.customerId,
    items: cart.items.map((item) => ({
      _id: item._id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    })),
    appliedCouponId: cart.appliedCouponId,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
}

export function buildExpectedCarts({ registry, clock }) {
  return CART_DEFINITIONS.map((definition) => {
    const timestamp = clock.atLocalTime(
      clock.daysAgo(definition.timestampDaysAgo),
      { hour: 10 },
    );

    return {
      _id: registry.idFor(definition.seedKey),
      seedKey: definition.seedKey,
      customerSeedKey: definition.customerSeedKey,
      customerId: registry.idFor(definition.customerSeedKey),
      items: definition.items.map((item) => ({
        _id: registry.idFor(item.seedKey),
        seedKey: item.seedKey,
        productSeedKey: item.productSeedKey,
        productId: registry.idFor(item.productSeedKey),
        variantSeedKey: item.variantSeedKey,
        variantId: item.variantSeedKey
          ? registry.idFor(item.variantSeedKey)
          : null,
        quantity: item.quantity,
      })),
      appliedCouponSeedKey: definition.appliedCouponSeedKey,
      appliedCouponId: definition.appliedCouponSeedKey
        ? registry.idFor(definition.appliedCouponSeedKey)
        : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
}

export async function validateCartDefinitions({ registry, clock }) {
  const carts = buildExpectedCarts({ registry, clock });
  const items = carts.flatMap((cart) => cart.items);
  const lineCounts = carts.map((cart) => cart.items.length);
  const simpleItems = items.filter((item) => item.variantId === null);
  const variantItems = items.filter((item) => item.variantId !== null);

  assertSeed(
    carts.length === 3 &&
      items.length === 6 &&
      isDeepStrictEqual(lineCounts, [3, 2, 1]) &&
      simpleItems.length === 2 &&
      variantItems.length === 4 &&
      registry.counts.carts === 3 &&
      registry.counts.cartItems === 6,
    'DEMO_CART_DEFINITION_COUNTS_INVALID',
    'Cart definitions must contain the exact 3/6 scenario distribution.',
  );

  const cartIds = carts.map((cart) => idString(cart._id));
  const itemIds = items.map((item) => idString(item._id));

  assertSeed(
    new Set(cartIds).size === 3 && new Set(itemIds).size === 6,
    'DEMO_CART_IDENTITIES_INVALID',
    'Cart and embedded Cart Item IDs must be unique.',
  );

  for (const cart of carts) {
    const lineIdentities = cart.items.map(
      (item) => `${idString(item.productId)}:${idString(item.variantId) || 'simple'}`,
    );

    assertSeed(
      new Set(lineIdentities).size === lineIdentities.length &&
        cart.items.every(
          (item) => Number.isSafeInteger(item.quantity) && item.quantity > 0,
        ),
      'DEMO_CART_LINE_DEFINITION_INVALID',
      `Cart ${cart.seedKey} has invalid or duplicate lines.`,
    );

    const model = new Cart(cartPayload(cart));
    await model.validate();
  }

  return {
    carts,
    counts: Object.freeze({ carts: 3, items: 6, simpleItems: 2, variantItems: 4 }),
  };
}

export function classifyCartRecord({ expected, recordById, recordByCustomer }) {
  if (!recordById && !recordByCustomer) {
    return { classification: CART_CLASSIFICATIONS.MISSING };
  }

  if (
    recordById &&
    idString(recordById.customerId) !== idString(expected.customerId)
  ) {
    return { classification: CART_CLASSIFICATIONS.ID_CONFLICT };
  }

  if (
    recordByCustomer &&
    idString(recordByCustomer._id) !== idString(expected._id)
  ) {
    return { classification: CART_CLASSIFICATIONS.CUSTOMER_CONFLICT };
  }

  const existing = recordById || recordByCustomer;

  return {
    classification: isDeepStrictEqual(
      comparableCart(existing),
      comparableCart(expected),
    )
      ? CART_CLASSIFICATIONS.EXACT
      : CART_CLASSIFICATIONS.DRIFT,
  };
}

export function findLegacyCartPlaceholders(records) {
  const legacyIds = new Set(
    LEGACY_CART_KEYS.map((key) => idString(deterministicObjectId(key))),
  );

  return records.filter((record) => legacyIds.has(idString(record._id)));
}

export async function preflightCarts({
  expectedCarts,
  registry,
  records = null,
}) {
  const existingRecords = records ?? (await Cart.find({}).lean());

  if (findLegacyCartPlaceholders(existingRecords).length > 0) {
    throw new SeedDriftError(
      'A removed generic deterministic Cart placeholder unexpectedly exists.',
    );
  }

  const forbiddenCustomerIds = new Set(
    CART_FREE_USER_KEYS.map((key) => idString(registry.idFor(key))),
  );
  const unexpected = existingRecords.filter((record) =>
    forbiddenCustomerIds.has(idString(record.customerId)),
  );

  if (unexpected.length > 0) {
    throw new SeedDriftError(
      'A deterministic demo identity that must remain Cart-free already owns a Cart.',
    );
  }

  const recordsById = new Map(
    existingRecords.map((record) => [idString(record._id), record]),
  );
  const recordsByCustomer = new Map();

  for (const record of existingRecords) {
    const customerId = idString(record.customerId);

    if (recordsByCustomer.has(customerId)) {
      throw new SeedDriftError(
        `Cart preflight found duplicate Customer ownership for ${customerId}.`,
      );
    }

    recordsByCustomer.set(customerId, record);
  }

  const results = expectedCarts.map((expected) => ({
    expected,
    existingRecord:
      recordsById.get(idString(expected._id)) ||
      recordsByCustomer.get(idString(expected.customerId)),
    ...classifyCartRecord({
      expected,
      recordById: recordsById.get(idString(expected._id)),
      recordByCustomer: recordsByCustomer.get(idString(expected.customerId)),
    }),
  }));
  const failures = results.filter(
    (result) =>
      ![
        CART_CLASSIFICATIONS.MISSING,
        CART_CLASSIFICATIONS.EXACT,
      ].includes(result.classification),
  );

  if (failures.length > 0) {
    throw new SeedDriftError(
      `Cart preflight rejected: ${failures
        .map((failure) =>
          `${failure.expected.seedKey}:${failure.classification}`,
        )
        .join(', ')}.`,
    );
  }

  return results;
}

export async function snapshotUnrelatedCarts(expectedCarts) {
  const expectedIds = new Set(
    expectedCarts.map((cart) => idString(cart._id)),
  );
  const expectedCustomers = new Set(
    expectedCarts.map((cart) => idString(cart.customerId)),
  );
  const records = await Cart.collection.find({}).sort({ _id: 1 }).toArray();

  return JSON.stringify(
    records.filter(
      (record) =>
        !expectedIds.has(idString(record._id)) &&
        !expectedCustomers.has(idString(record.customerId)),
    ),
  );
}

async function assertCartUsers(expectedCarts, registry) {
  const users = await User.find({
    _id: { $in: DEMO_USER_IDENTITIES.map((identity) => registry.idFor(identity.key)) },
  });
  const usersById = new Map(users.map((user) => [idString(user._id), user]));

  assertSeed(
    users.length === DEMO_USER_IDENTITIES.length,
    'DEMO_CART_USER_SET_INVALID',
    'All eight deterministic Users must exist before Cart seeding.',
  );

  for (const identity of DEMO_USER_IDENTITIES) {
    const user = usersById.get(idString(registry.idFor(identity.key)));

    assertSeed(
      user?.email === identity.email &&
        user.role === identity.role &&
        user.emailVerified === true,
      'DEMO_CART_USER_PRECONDITION_FAILED',
      `User ${identity.email} does not match its deterministic identity.`,
    );
  }

  for (const cart of expectedCarts) {
    const user = usersById.get(idString(cart.customerId));

    assertSeed(
      user?.role === 'customer' && cart.createdAt > user.createdAt,
      'DEMO_CART_TIMESTAMP_PRECONDITION_FAILED',
      `Cart ${cart.seedKey} must occur after its owning Customer was created.`,
    );
  }
}

async function assertProductsAndInventory({ expectedCarts, registry, threshold }) {
  const items = expectedCarts.flatMap((cart) => cart.items);
  const products = await Product.find({
    _id: { $in: items.map((item) => item.productId) },
  });
  const productsById = new Map(
    products.map((product) => [idString(product._id), product]),
  );

  assertSeed(
    products.length === Object.keys(PRODUCT_REQUIREMENTS).length,
    'DEMO_CART_PRODUCT_SET_INVALID',
    'All six exact Cart Products must exist.',
  );

  for (const [productSeedKey, requirement] of Object.entries(
    PRODUCT_REQUIREMENTS,
  )) {
    const product = productsById.get(idString(registry.idFor(productSeedKey)));
    const variants = product?.variants || [];

    assertSeed(
      product?.name === requirement.name && product.isActive === true,
      'DEMO_CART_PRODUCT_PRECONDITION_FAILED',
      `Product ${productSeedKey} is missing, inactive, or drifted.`,
    );

    if (requirement.variantSeedKey === null) {
      assertSeed(
        variants.length === 0,
        'DEMO_CART_PRODUCT_MODE_INVALID',
        `Product ${productSeedKey} must remain simple.`,
      );
      continue;
    }

    const variant = variants.id(registry.idFor(requirement.variantSeedKey));

    assertSeed(
      variant && variant.isActive === requirement.variantActive,
      'DEMO_CART_VARIANT_PRECONDITION_FAILED',
      `Variant ${requirement.variantSeedKey} has unexpected availability.`,
    );
  }

  const validCarts = expectedCarts.filter(
    (cart) => cart.customerSeedKey !== 'user:support',
  );
  const lineTotals = new Map();

  for (const item of validCarts.flatMap((cart) => cart.items)) {
    const resolved = await resolveCartItemForAdd({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      existingQuantity: 0,
    });

    lineTotals.set(item.seedKey, resolved.unitPrice * item.quantity);
  }

  const supportItem = expectedCarts.find(
    (cart) => cart.customerSeedKey === 'user:support',
  ).items[0];
  let supportRejected = false;

  try {
    await resolveCartItemForAdd({
      productId: supportItem.productId,
      variantId: supportItem.variantId,
      quantity: supportItem.quantity,
      existingQuantity: 0,
    });
  } catch (error) {
    supportRejected =
      error instanceof AppError && error.code === 'CART_ITEM_UNAVAILABLE';
  }

  assertSeed(
    supportRejected,
    'DEMO_CART_SUPPORT_STALE_CONDITION_INVALID',
    'The support Cart Variant must be rejected as CART_ITEM_UNAVAILABLE.',
  );

  const supportInventory = await Inventory.findById(
    registry.idFor(
      'inventory:product:running:temporun-daily-trainers:variant:04',
    ),
  );

  assertSeed(
    supportInventory &&
      idString(supportInventory.productId) === idString(supportItem.productId) &&
      idString(supportInventory.variantId) === idString(supportItem.variantId) &&
      supportInventory.quantity > threshold,
    'DEMO_CART_SUPPORT_INVENTORY_INVALID',
    'Support Cart Inventory must exist and remain above the low-stock threshold.',
  );

  return lineTotals;
}

async function assertCouponPrecondition(expectedCarts, registry, lineTotals) {
  const checkout = expectedCarts.find(
    (cart) => cart.customerSeedKey === 'user:checkout',
  );
  const subtotal = checkout.items.reduce(
    (total, item) => total + lineTotals.get(item.seedKey),
    0,
  );
  const coupon = await Coupon.findById(registry.idFor('coupon:DEMO10'));

  assertSeed(
    coupon?.code === 'DEMO10' &&
      coupon.isActive === true &&
      coupon.usageLimit === null &&
      coupon.usedCount === 0,
    'DEMO_CART_COUPON_PRECONDITION_FAILED',
    'DEMO10 must be active, unlimited, unused, and seed-owned.',
  );

  const pricing = await resolveCouponByIdForSubtotal({
    couponId: coupon._id,
    subtotal,
  });

  assertSeed(
    subtotal === EXPECTED_PRICING.checkout.subtotal &&
      pricing.discountAmount === EXPECTED_PRICING.checkout.discountAmount &&
      pricing.totalAmount === EXPECTED_PRICING.checkout.totalAmount,
    'DEMO_CART_CHECKOUT_PRICING_DRIFT',
    'Current Product/Coupon authority no longer produces locked checkout pricing.',
  );

  const orders = expectedCarts.find(
    (cart) => cart.customerSeedKey === 'user:orders',
  );
  const ordersSubtotal = orders.items.reduce(
    (total, item) => total + lineTotals.get(item.seedKey),
    0,
  );

  assertSeed(
    ordersSubtotal === EXPECTED_PRICING.orders.subtotal,
    'DEMO_CART_ORDERS_PRICING_DRIFT',
    'Current Product authority no longer produces locked orders pricing.',
  );
}

export async function validateCartDatabasePreconditions({
  expectedCarts,
  registry,
  threshold,
}) {
  await assertCartUsers(expectedCarts, registry);
  const lineTotals = await assertProductsAndInventory({
    expectedCarts,
    registry,
    threshold,
  });
  await assertCouponPrecondition(expectedCarts, registry, lineTotals);

  return { lineTotals };
}

export function assertResolvedCartScenarios(resources) {
  const checkout = resources.checkout;
  const orders = resources.orders;
  const support = resources.support;

  assertSeed(
    checkout.items.length === 3 &&
      checkout.issues.length === 0 &&
      checkout.warnings.length === 0 &&
      checkout.canCheckout === true &&
      checkout.coupon?.code === 'DEMO10' &&
      isDeepStrictEqual(checkout.pricing, EXPECTED_PRICING.checkout),
    'DEMO_CART_CHECKOUT_RESOLUTION_FAILED',
    'Checkout Cart did not resolve to its locked valid state.',
  );
  assertSeed(
    orders.items.length === 2 &&
      orders.issues.length === 0 &&
      orders.warnings.length === 0 &&
      orders.canCheckout === true &&
      orders.coupon === null &&
      isDeepStrictEqual(orders.pricing, EXPECTED_PRICING.orders),
    'DEMO_CART_ORDERS_RESOLUTION_FAILED',
    'Orders Cart did not resolve to its locked valid state.',
  );

  const supportIssues = support.items.flatMap((item) => item.issues);

  assertSeed(
    support.items.length === 1 &&
      support.canCheckout === false &&
      support.warnings.length === 0 &&
      support.issues.length === 1 &&
      supportIssues.length === 1 &&
      supportIssues[0].code === 'CART_ITEM_UNAVAILABLE' &&
      support.items[0].availability.isAvailable === false,
    'DEMO_CART_SUPPORT_RESOLUTION_FAILED',
    'Support Cart did not resolve to the exact intended stale-line state.',
  );
}

export async function verifyPersistedCartResolutions(expectedCarts) {
  const resources = {};

  for (const expected of expectedCarts) {
    const cart = await Cart.findById(expected._id);
    const scenario = expected.customerSeedKey.slice('user:'.length);

    assertSeed(
      cart && idString(cart.customerId) === idString(expected.customerId),
      'DEMO_CART_POSTFLIGHT_MISSING',
      `Persisted Cart ${expected.seedKey} is missing after seeding.`,
    );
    resources[scenario] = await resolveCustomerCart(cart);
    assertSeed(
      resources[scenario].id === idString(expected._id),
      'DEMO_CART_RESOLVED_ID_INVALID',
      `Resolved Cart ${expected.seedKey} has an unexpected ID.`,
    );
  }

  assertResolvedCartScenarios(resources);
  return resources;
}

export function assertCheckoutPreviewScenarios(results) {
  const checkout = results.checkout;
  const orders = results.orders;
  const support = results.support;

  assertSeed(
    checkout.preview.canProceed === true &&
      checkout.checkoutSnapshot?.items.length === 3 &&
      checkout.checkoutSnapshot?.coupon?.code === 'DEMO10' &&
      checkout.checkoutSnapshot.subtotal === 629610 &&
      checkout.checkoutSnapshot.discountAmount === 62961 &&
      checkout.checkoutSnapshot.totalAmount === 566649,
    'DEMO_CART_CHECKOUT_PREVIEW_FAILED',
    'Checkout Customer preview/snapshot did not match the locked scenario.',
  );
  assertSeed(
    orders.preview.canProceed === true &&
      orders.checkoutSnapshot?.items.length === 2 &&
      orders.checkoutSnapshot?.coupon === null &&
      orders.checkoutSnapshot.totalAmount === 1499800,
    'DEMO_CART_ORDERS_PREVIEW_FAILED',
    'Orders Customer preview/snapshot did not match the locked scenario.',
  );
  assertSeed(
    support.preview.canProceed === false &&
      support.checkoutSnapshot === null &&
      support.preview.issues.length === 1 &&
      support.preview.issues[0].code === 'CART_ITEM_UNAVAILABLE',
    'DEMO_CART_SUPPORT_PREVIEW_FAILED',
    'Support Customer checkout preview did not preserve the stale-line issue.',
  );
}

export async function verifyCheckoutPreviews({ registry }) {
  const results = {};

  for (const scenario of ['checkout', 'orders', 'support']) {
    results[scenario] = await resolveCheckoutForCustomer({
      customerId: registry.idFor(`user:${scenario}`),
      shippingAddressId: registry.idFor(`address:${scenario}:primary`),
    });
  }

  assertCheckoutPreviewScenarios(results);
  return results;
}

export async function snapshotCartProtectedState(registry) {
  const inventory = await Inventory.collection
    .find({
      _id: {
        $in: registry.keysByEntity.inventory.map((key) => registry.idFor(key)),
      },
    })
    .sort({ _id: 1 })
    .toArray();
  const adjustments = await InventoryAdjustment.collection
    .find({
      _id: {
        $in: registry.keysByEntity.inventoryAdjustments.map((key) =>
          registry.idFor(key),
        ),
      },
    })
    .sort({ _id: 1 })
    .toArray();
  const coupons = await Coupon.collection
    .find({
      _id: {
        $in: registry.keysByEntity.coupons.map((key) => registry.idFor(key)),
      },
    })
    .sort({ _id: 1 })
    .toArray();

  assertSeed(
    inventory.length === 105 && adjustments.length === 104 && coupons.length === 8,
    'DEMO_CART_PROTECTED_STATE_INCOMPLETE',
    'Cart seeding requires the complete Inventory, adjustment, and Coupon foundation.',
  );

  return JSON.stringify({ inventory, adjustments, coupons });
}

export async function seedCarts({ registry, clock, threshold }) {
  const validated = await validateCartDefinitions({ registry, clock });
  await validateCartDatabasePreconditions({
    expectedCarts: validated.carts,
    registry,
    threshold,
  });
  const protectedBefore = await snapshotCartProtectedState(registry);
  const unrelatedBefore = await snapshotUnrelatedCarts(validated.carts);
  const preflight = await preflightCarts({
    expectedCarts: validated.carts,
    registry,
  });
  const missing = preflight.filter(
    (result) => result.classification === CART_CLASSIFICATIONS.MISSING,
  );

  if (missing.length > 0) {
    try {
      await withSeedTransaction(async (session) => {
        await Cart.insertMany(
          missing.map((result) => cartPayload(result.expected)),
          { ordered: true, session },
        );
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw new SeedValidationError(
          'DEMO_CART_DUPLICATE_KEY',
          'A concurrent write created a Cart ownership conflict.',
        );
      }

      throw error;
    }
  }

  const postflight = await preflightCarts({
    expectedCarts: validated.carts,
    registry,
  });
  const resources = await verifyPersistedCartResolutions(validated.carts);
  const checkout = await verifyCheckoutPreviews({ registry });
  const protectedAfter = await snapshotCartProtectedState(registry);
  const unrelatedAfter = await snapshotUnrelatedCarts(validated.carts);

  assertSeed(
    postflight.every(
      (result) => result.classification === CART_CLASSIFICATIONS.EXACT,
    ),
    'DEMO_CART_POSTFLIGHT_FAILED',
    'Cart post-write verification did not find three exact records.',
  );
  assertSeed(
    protectedBefore === protectedAfter,
    'DEMO_CART_PROTECTED_STATE_CHANGED',
    'Inventory, InventoryAdjustments, or Coupons changed during Cart seeding.',
  );
  assertSeed(
    unrelatedBefore === unrelatedAfter,
    'DEMO_CART_UNRELATED_CHANGED',
    'Unrelated Carts changed during deterministic Cart seeding.',
  );

  return {
    ...validated,
    created: missing.length,
    skipped: validated.carts.length - missing.length,
    itemsPersisted: validated.counts.items,
    resources,
    checkout,
  };
}

export function exactCartOwnershipFilter(expectedCarts) {
  if (!Array.isArray(expectedCarts) || expectedCarts.length === 0) {
    throw new SeedValidationError(
      'DEMO_CART_RESET_SCOPE_INVALID',
      'Cart reset requires exact preflighted Cart identities.',
    );
  }

  return {
    $or: expectedCarts.map((cart) => ({
      _id: cart._id,
      customerId: cart.customerId,
    })),
  };
}

export async function resetCarts({ registry, clock }) {
  const validated = await validateCartDefinitions({ registry, clock });
  const preflight = await preflightCarts({
    expectedCarts: validated.carts,
    registry,
  });
  const exact = preflight.filter(
    (result) => result.classification === CART_CLASSIFICATIONS.EXACT,
  );

  if (exact.length === 0) {
    return { deleted: 0 };
  }

  const carts = exact.map((result) => result.expected);
  let deleted = 0;

  await withSeedTransaction(async (session) => {
    const result = await Cart.deleteMany(exactCartOwnershipFilter(carts), {
      session,
    });
    deleted = result.deletedCount;

    if (deleted !== carts.length) {
      throw new SeedValidationError(
        'DEMO_CART_RESET_COUNT_MISMATCH',
        'Cart reset did not delete the exact preflighted set.',
      );
    }
  });

  return { deleted };
}
