import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import * as argon2 from 'argon2';

import { validateCouponForSubtotal } from '../../modules/coupon/coupon.service.js';
import { getCurrentProductPrice } from '../../modules/catalog/product.service.js';
import {
  INVENTORY_ADJUSTMENT_REASONS,
} from '../../modules/inventory/inventory.constants.js';

import {
  assertDemoCloudinaryUploadAllowed,
  assertSeedRuntimeSafety,
  createSeedConfig,
  requireDemoSeedPassword,
} from './seed.config.js';
import { createSeedClock } from './seed.clock.js';
import {
  CATEGORY_CLASSIFICATIONS,
  CATEGORY_DEFINITIONS,
  buildExpectedCategories,
  classifyCategoryRecord,
  createCategoryNameKey,
  exactCategoryOwnershipFilter,
  validateCategoryDefinitions,
} from './categories.seed.js';
import {
  DEMO_ADDRESS_KEYS,
  DEMO_COUPON_IDENTITIES,
  DEMO_USER_IDENTITIES,
  buildInventoryRegistryPlan,
  createSeedRegistry,
  deterministicObjectId,
} from './seed.registry.js';
import { loadAndValidateProductManifest } from './seed.validation.js';
import {
  normalizedVariantKey,
  validateProductDefinitions,
} from './products.seed.js';
import {
  PRODUCT_CLASSIFICATIONS,
  assertNoProductResetDependencies,
  buildExpectedPersistedProducts,
  buildFinalProductPayloads,
  classifyProductRecord,
  cleanupCurrentRunUploads,
  cloudinaryPermissionIsRequired,
  exactProductOwnershipFilter,
  missingProductResults,
  validateCloudinaryImageMetadata,
  validateFinalProductPayloads,
  verifyRequiredProductAssets,
} from './product.persistence.seed.js';
import {
  DEMO_INVENTORY_RECONCILIATION_NOTE,
  INVENTORY_CLASSIFICATIONS,
  INVENTORY_RESET_ORDER,
  classifyInventoryPosition,
  exactInventoryOwnershipFilter,
  getSeedStockState,
  naturalInventoryIdentity,
  reconcileInventoryLedgers,
  resolveSeedLowStockThreshold,
  validateInventoryDefinitions,
} from './inventory.seed.js';
import {
  COUPON_CLASSIFICATIONS,
  COUPON_DEFINITIONS,
  LEGACY_DEMO_COUPON_CODES,
  assertNoCouponResetDependencies,
  classifyCouponRecord,
  exactCouponOwnershipFilter,
  findLegacyCouponPlaceholders,
  validateCouponDefinitions,
} from './coupon.seed.js';
import {
  CART_CLASSIFICATIONS,
  CART_DEFINITIONS,
  CART_FREE_USER_KEYS,
  LEGACY_CART_KEYS,
  assertCheckoutPreviewScenarios,
  assertResolvedCartScenarios,
  buildExpectedCarts,
  classifyCartRecord,
  exactCartOwnershipFilter,
  preflightCarts,
  validateCartDefinitions,
} from './cart.seed.js';
import * as commerceScenarioModule from './commerce.scenarios.seed.js';
import {
  HISTORICAL_COMMERCE_PRODUCT_KEYS,
  HISTORICAL_CUSTOMER_ORDER_COUNTS,
  HISTORICAL_STATUS_COUNTS,
  buildHistoricalOrderDefinitions,
  buildHistoricalPaymentDefinitions,
  validateHistoricalCommerceScenarioMatrix,
} from './commerce.scenarios.seed.js';
import {
  HISTORICAL_COMMERCE_STATES,
  assertNoHistoricalResetDependencies,
  classifyHistoricalCommerceSnapshot,
  exactHistoricalIdFilter,
  validateHistoricalPersistenceDefinitions,
} from './commerce.persistence.seed.js';
import {
  DEMO_USER_CLASSIFICATIONS,
  DEMO_USER_DEFINITIONS,
  buildExpectedDemoUsers,
  classifyDemoUserRecord,
  exactDemoUserPairFilter,
  validateDemoSeedPassword,
  validateDemoUserDefinitions,
} from './users.seed.js';
import {
  LEGACY_REVIEW_KEYS,
  REVIEW_CLASSIFICATIONS,
  REVIEW_DEFINITIONS,
  classifyReviewRecord,
  exactReviewOwnershipFilter,
  findLegacyReviewPlaceholders,
  preflightReviews,
  validateReviewDefinitions,
} from './reviews.seed.js';
import {
  LEGACY_REFUND_KEYS,
  REFUND_CLASSIFICATIONS,
  classifyRefundRecord,
  exactRefundOwnershipFilter,
  findLegacyRefundPlaceholders,
  preflightRefunds,
  validateRefundDefinitions,
} from './refunds.seed.js';
import { refundScopesConflict } from '../../modules/refund/refund.domain.js';

const TEST_DATABASE = 'multisports_seed_test';

function safeEnvironment(overrides = {}) {
  return {
    NODE_ENV: 'development',
    ALLOW_DEMO_SEED: 'true',
    MONGODB_URI: `mongodb://127.0.0.1:27017/${TEST_DATABASE}`,
    DEMO_SEED_DATABASE: TEST_DATABASE,
    APP_TIMEZONE: 'Asia/Kolkata',
    ...overrides,
  };
}

test('deterministic IDs are stable, distinct, and valid', () => {
  const first = deterministicObjectId('user:checkout');
  const repeated = deterministicObjectId('user:checkout');
  const different = deterministicObjectId('user:orders');

  assert.equal(first.toHexString(), repeated.toHexString());
  assert.notEqual(first.toHexString(), different.toHexString());
  assert.match(first.toHexString(), /^[a-f0-9]{24}$/);
});

test('production rejection overrides every other seed setting', () => {
  const config = createSeedConfig(
    safeEnvironment({
      NODE_ENV: 'production',
      ALLOW_DEMO_SEED: 'true',
    }),
  );

  assert.throws(
    () => assertSeedRuntimeSafety(config),
    (error) => error.code === 'DEMO_SEED_PRODUCTION_FORBIDDEN',
  );
});

test('Cloudinary upload and User password require separate lazy opt-ins', () => {
  const config = assertSeedRuntimeSafety(createSeedConfig(safeEnvironment()));

  assert.throws(
    () => assertDemoCloudinaryUploadAllowed(config),
    (error) => error.code === 'DEMO_CLOUDINARY_UPLOAD_NOT_ALLOWED',
  );
  assert.throws(
    () => requireDemoSeedPassword(config),
    (error) => error.code === 'DEMO_SEED_PASSWORD_REQUIRED',
  );

  const enabled = assertSeedRuntimeSafety(
    createSeedConfig(
      safeEnvironment({
        ALLOW_DEMO_CLOUDINARY_UPLOAD: 'true',
        DEMO_SEED_PASSWORD: 'present-only-for-this-test',
      }),
    ),
  );

  assert.doesNotThrow(() => assertDemoCloudinaryUploadAllowed(enabled));
  assert.equal(requireDemoSeedPassword(enabled), 'present-only-for-this-test');
});

test('ALLOW_DEMO_SEED requires the exact lowercase true value', () => {
  for (const value of ['', 'false', 'TRUE', '1']) {
    const config = createSeedConfig(
      safeEnvironment({ ALLOW_DEMO_SEED: value }),
    );

    assert.throws(
      () => assertSeedRuntimeSafety(config),
      (error) => error.code === 'DEMO_SEED_NOT_ALLOWED',
    );
  }
});

test('DEMO_SEED_DATABASE is mandatory', () => {
  const config = createSeedConfig(
    safeEnvironment({ DEMO_SEED_DATABASE: '' }),
  );

  assert.throws(
    () => assertSeedRuntimeSafety(config),
    (error) => error.code === 'DEMO_SEED_DATABASE_REQUIRED',
  );
});

test('the URI database must equal DEMO_SEED_DATABASE', () => {
  const config = createSeedConfig(
    safeEnvironment({
      MONGODB_URI: 'mongodb://127.0.0.1:27017/multisports_store',
      DEMO_SEED_DATABASE: 'another_database',
    }),
  );

  assert.throws(
    () => assertSeedRuntimeSafety(config),
    (error) => error.code === 'DEMO_SEED_DATABASE_MISMATCH',
  );
});

test('the explicitly approved current database name is accepted', () => {
  const config = createSeedConfig(
    safeEnvironment({
      MONGODB_URI: 'mongodb://127.0.0.1:27017/multisports_store',
      DEMO_SEED_DATABASE: 'multisports_store',
    }),
  );

  assert.doesNotThrow(() => assertSeedRuntimeSafety(config));
});

test('the locked manifest and complete registry validate', async () => {
  const manifest = await loadAndValidateProductManifest();
  const registry = createSeedRegistry(manifest);
  const ids = registry.entries.map((entry) => entry.idString);

  assert.equal(manifest.products.length, 42);
  assert.equal(registry.counts.users, 8);
  assert.equal(registry.counts.addresses, 8);
  assert.equal(registry.counts.categories, 21);
  assert.equal(registry.counts.products, 42);
  assert.equal(registry.counts.variants, 84);
  assert.equal(registry.counts.productImages, 84);
  assert.equal(registry.counts.inventory, 105);
  assert.equal(registry.counts.inventoryAdjustments, 104);
  assert.equal(registry.counts.coupons, 8);
  assert.equal(registry.counts.carts, 3);
  assert.equal(registry.counts.cartItems, 6);
  assert.equal(registry.counts.commerceItems, 53);
  assert.equal(registry.counts.payments, 46);
  assert.equal(registry.counts.orders, 42);
  assert.equal(registry.counts.historicalInventoryAdjustments, 53);
  assert.equal(registry.entries.length, 717);
  assert.equal(new Set(ids).size, ids.length);
});

test('locked Category definitions match service normalization and sport coverage', () => {
  const naturalKeys = CATEGORY_DEFINITIONS.map(
    (category) => `${category.sport}:${category.nameKey}`,
  );

  assert.equal(CATEGORY_DEFINITIONS.length, 21);
  assert.equal(new Set(naturalKeys).size, 21);
  assert.equal(
    new Set(CATEGORY_DEFINITIONS.map((category) => category.categoryKey)).size,
    21,
  );
  assert.ok(CATEGORY_DEFINITIONS.every((category) => category.isActive));
  assert.equal(createCategoryNameKey('  Training   Equipment  '), 'training equipment');

  for (const sport of [
    'football',
    'cricket',
    'basketball',
    'tennis',
    'badminton',
    'running',
    'fitness',
  ]) {
    assert.equal(
      CATEGORY_DEFINITIONS.filter((category) => category.sport === sport)
        .length,
      3,
    );
  }
});

async function categoryFixture() {
  const manifest = await loadAndValidateProductManifest();
  const registry = createSeedRegistry(manifest);
  const clock = createSeedClock({
    anchorDate: '2026-08-22',
    timeZone: 'Asia/Kolkata',
  });
  const categories = await validateCategoryDefinitions({
    registry,
    clock,
    manifest,
  });

  return { manifest, registry, clock, categories, expected: categories[0] };
}

test('Category definitions have deterministic IDs and exact manifest coverage', async () => {
  const { manifest, categories } = await categoryFixture();
  const ids = categories.map((category) => category._id.toString());
  const manifestKeys = new Set(
    manifest.products.map((product) => product.categoryKey),
  );

  assert.equal(categories.length, 21);
  assert.equal(new Set(ids).size, 21);
  assert.deepEqual(
    new Set(categories.map((category) => category.categoryKey)),
    manifestKeys,
  );
});

test('Category preflight classification covers missing and exact records', async () => {
  const { expected } = await categoryFixture();

  assert.equal(
    classifyCategoryRecord({ expected }).classification,
    CATEGORY_CLASSIFICATIONS.MISSING,
  );
  assert.equal(
    classifyCategoryRecord({
      expected,
      recordById: expected,
      recordByNaturalKey: expected,
    }).classification,
    CATEGORY_CLASSIFICATIONS.EXACT,
  );
});

test('Category preflight classification detects natural, ID, and field conflicts', async () => {
  const { expected } = await categoryFixture();
  const naturalConflict = {
    ...expected,
    _id: deterministicObjectId('conflict:category:natural'),
  };
  const idConflict = {
    ...expected,
    sport: 'cricket',
    nameKey: 'different',
  };
  const drift = { ...expected, name: 'Changed Name' };

  assert.equal(
    classifyCategoryRecord({ expected, recordByNaturalKey: naturalConflict })
      .classification,
    CATEGORY_CLASSIFICATIONS.NATURAL_KEY_CONFLICT,
  );
  assert.equal(
    classifyCategoryRecord({ expected, recordById: idConflict }).classification,
    CATEGORY_CLASSIFICATIONS.ID_CONFLICT,
  );
  assert.equal(
    classifyCategoryRecord({ expected, recordById: drift }).classification,
    CATEGORY_CLASSIFICATIONS.DRIFT,
  );
});

test('Category reset ownership filter requires exact ID, sport, and nameKey', async () => {
  const { expected } = await categoryFixture();

  assert.deepEqual(exactCategoryOwnershipFilter([expected]), {
    $or: [
      {
        _id: expected._id,
        sport: expected.sport,
        nameKey: expected.nameKey,
      },
    ],
  });
});

test('complete Product definitions match all locked catalog totals', async () => {
  const { manifest, registry, categories } = await categoryFixture();
  const result = validateProductDefinitions({
    manifest,
    registry,
    categories,
  });

  assert.deepEqual(result.counts, {
    products: 42,
    simple: 21,
    variant: 21,
    active: 38,
    inactive: 4,
    variants: 84,
    images: 84,
    noDiscount: 21,
    percentageDiscount: 14,
    fixedDiscount: 7,
    minimumPrice: 29900,
    maximumPrice: 899900,
  });
  assert.ok(Object.values(result.sportCounts).every((count) => count === 6));
  assert.equal(
    Object.values(result.categoryCounts).reduce(
      (total, count) => total + count,
      0,
    ),
    42,
  );
});

test('Product IDs, Variant IDs, and image blueprint IDs are unique', async () => {
  const { manifest, registry, categories } = await categoryFixture();
  const { definitions } = validateProductDefinitions({
    manifest,
    registry,
    categories,
  });
  const productIds = definitions.map((product) => product._id.toString());
  const variants = definitions.flatMap((product) => product.variants);
  const images = definitions.flatMap((product) => product.images);

  assert.equal(new Set(productIds).size, 42);
  assert.equal(new Set(variants.map((variant) => variant._id.toString())).size, 84);
  assert.equal(new Set(images.map((image) => image._id.toString())).size, 84);
  assert.equal(new Set(images.map((image) => image.file)).size, 84);
  assert.ok(
    images.every(
      (image) =>
        !Object.hasOwn(image, 'publicId') && !Object.hasOwn(image, 'url'),
    ),
  );
});

test('Product variants have four unique option combinations and 3/1 activity', async () => {
  const { manifest, registry, categories } = await categoryFixture();
  const { definitions } = validateProductDefinitions({
    manifest,
    registry,
    categories,
  });

  for (const product of definitions) {
    if (product.productType === 'simple') {
      assert.equal(product.variants.length, 0);
      continue;
    }

    assert.equal(product.variants.length, 4);
    assert.equal(
      new Set(
        product.variants.map((variant) =>
          normalizedVariantKey(variant.options),
        ),
      ).size,
      4,
    );
    assert.deepEqual(
      product.variants.map((variant) => variant.isActive),
      [true, true, true, false],
    );
  }
});

test('Product definitions contain only scalar specifications and no inventory state', async () => {
  const { manifest, registry, categories } = await categoryFixture();
  const { definitions, brandCounts } = validateProductDefinitions({
    manifest,
    registry,
    categories,
  });

  assert.ok(
    definitions.every(
      (product) =>
        !Object.hasOwn(product, 'initialQuantity') &&
        !Object.hasOwn(product, 'stockQuantity') &&
        Object.values(product.specifications).every((value) =>
          ['string', 'number', 'boolean'].includes(typeof value),
        ),
    ),
  );
  assert.ok(
    Object.values(brandCounts).every(
      (counts) => Object.values(counts).every((count) => count === 3),
    ),
  );
});

async function productPersistenceFixture() {
  const { manifest, registry, clock, categories } = await categoryFixture();
  const productResult = validateProductDefinitions({
    manifest,
    registry,
    categories,
  });
  const expectedProducts = buildExpectedPersistedProducts({
    definitions: productResult.definitions,
    clock,
  });
  const existingProducts = expectedProducts.map((product, productIndex) => ({
    ...product,
    images: product.images.map((image, imageIndex) => ({
      ...image,
      publicId:
        `multisports-store/product-images/test-${productIndex}-${imageIndex}`,
      url: `https://res.cloudinary.com/example/image/upload/test-${productIndex}-${imageIndex}.webp`,
    })),
  }));

  return {
    expectedProducts,
    existingProducts,
    productImageFolder: 'multisports-store/product-images',
  };
}

test('Product persistence identities and timestamps are deterministic', async () => {
  const { expectedProducts } = await productPersistenceFixture();

  assert.equal(expectedProducts.length, 42);
  assert.equal(
    new Set(expectedProducts.map((product) => product._id.toString())).size,
    42,
  );
  assert.ok(
    expectedProducts.every(
      (product) =>
        product.createdAt instanceof Date &&
        product.createdAt.toISOString() === product.updatedAt.toISOString(),
    ),
  );
});

test('Product preflight classification covers missing and exact records', async () => {
  const { expectedProducts, existingProducts, productImageFolder } =
    await productPersistenceFixture();
  const expected = expectedProducts[0];
  const existingRecord = existingProducts[0];

  assert.equal(
    classifyProductRecord({ expected, productImageFolder }).classification,
    PRODUCT_CLASSIFICATIONS.MISSING,
  );
  assert.equal(
    classifyProductRecord({
      expected,
      existingRecord,
      productImageFolder,
    }).classification,
    PRODUCT_CLASSIFICATIONS.EXACT,
  );
});

test('Product preflight detects deterministic ID conflict and locked-field drift', async () => {
  const { expectedProducts, existingProducts, productImageFolder } =
    await productPersistenceFixture();
  const expected = expectedProducts[0];
  const existingRecord = existingProducts[0];

  assert.equal(
    classifyProductRecord({
      expected,
      existingRecord: { ...existingRecord, name: 'Another Product' },
      productImageFolder,
    }).classification,
    PRODUCT_CLASSIFICATIONS.ID_CONFLICT,
  );
  assert.equal(
    classifyProductRecord({
      expected,
      existingRecord: { ...existingRecord, basePrice: 12345 },
      productImageFolder,
    }).classification,
    PRODUCT_CLASSIFICATIONS.DRIFT,
  );
});

test('Cloudinary mutation permission depends only on missing Products', () => {
  const exact = Array.from({ length: 42 }, () => ({
    classification: PRODUCT_CLASSIFICATIONS.EXACT,
  }));
  const withMissing = [
    ...exact.slice(0, 41),
    { classification: PRODUCT_CLASSIFICATIONS.MISSING },
  ];

  assert.equal(cloudinaryPermissionIsRequired(exact), false);
  assert.equal(cloudinaryPermissionIsRequired(withMissing), true);
  assert.equal(missingProductResults(exact).length, 0);
  assert.equal(missingProductResults(withMissing).length, 1);
});

test('Cloudinary image metadata requires the Product folder and HTTPS', () => {
  const folder = 'multisports-store/product-images';

  assert.equal(
    validateCloudinaryImageMetadata(
      {
        publicId: `${folder}/asset-01`,
        url: 'https://res.cloudinary.com/example/image/upload/asset-01.webp',
      },
      folder,
    ),
    true,
  );
  assert.equal(
    validateCloudinaryImageMetadata(
      { publicId: 'another-folder/asset-01', url: 'https://example.test/a' },
      folder,
    ),
    false,
  );
  assert.equal(
    validateCloudinaryImageMetadata(
      { publicId: `${folder}/asset-01`, url: 'http://example.test/a' },
      folder,
    ),
    false,
  );
});

test('all 84 required local WebP assets pass pre-upload integrity', async () => {
  const { expectedProducts } = await productPersistenceFixture();
  const missing = expectedProducts.map((expected) => ({
    expected,
    classification: PRODUCT_CLASSIFICATIONS.MISSING,
  }));
  const verified = await verifyRequiredProductAssets(missing);

  assert.equal(verified.length, 84);
  assert.equal(
    new Set(verified.map((file) => file.imageId.toString())).size,
    84,
  );
  assert.ok(verified.every((file) => file.buffer.length > 0));
});

test('final Product payloads retain embedded IDs and exclude seed-only fields', async () => {
  const { expectedProducts, productImageFolder } =
    await productPersistenceFixture();
  const missing = expectedProducts.map((expected) => ({
    expected,
    classification: PRODUCT_CLASSIFICATIONS.MISSING,
  }));
  const uploadedAssets = expectedProducts.flatMap((product, productIndex) =>
    product.images.map((image, imageIndex) => ({
      productSeedKey: product.seedKey,
      productId: product._id,
      imageId: image._id,
      sortOrder: image.sortOrder,
      publicId: `${productImageFolder}/payload-${productIndex}-${imageIndex}`,
      url: `https://res.cloudinary.com/example/image/upload/payload-${productIndex}-${imageIndex}.webp`,
    })),
  );
  const payloads = buildFinalProductPayloads({
    missingResults: missing,
    uploadedAssets,
  });

  await validateFinalProductPayloads({ payloads, productImageFolder });

  assert.equal(payloads.length, 42);
  assert.ok(
    payloads.every(
      (payload, index) =>
        !Object.hasOwn(payload, 'seedKey') &&
        !Object.hasOwn(payload, 'slug') &&
        !Object.hasOwn(payload, 'productType') &&
        payload.images.length === 2 &&
        payload.images.filter((image) => image.isPrimary).length === 1 &&
        payload.images.every(
          (image, imageIndex) =>
            image._id.toString() ===
            expectedProducts[index].images[imageIndex]._id.toString(),
        ) &&
        payload.variants.every(
          (variant, variantIndex) =>
            variant._id.toString() ===
            expectedProducts[index].variants[variantIndex]._id.toString(),
        ),
    ),
  );
});

test('upload cleanup is restricted to current-run public IDs', async () => {
  const uploadedAssets = [
    { publicId: 'multisports-store/product-images/current-01' },
    { publicId: 'multisports-store/product-images/current-02' },
  ];
  const deleted = [];
  const cleanup = await cleanupCurrentRunUploads(
    uploadedAssets,
    async (publicId) => deleted.push(publicId),
  );

  assert.deepEqual(deleted, uploadedAssets.map((asset) => asset.publicId));
  assert.deepEqual(cleanup, { attempted: 2, deleted: 2, failed: 0 });
});

test('Product reset ownership is exact and Inventory dependencies are refused', async () => {
  const { expectedProducts } = await productPersistenceFixture();
  const [expected] = expectedProducts;

  assert.deepEqual(exactProductOwnershipFilter([expected]), {
    $or: [
      {
        _id: expected._id,
        name: expected.name,
        sport: expected.sport,
        categoryId: expected.categoryId,
      },
    ],
  });
  assert.throws(
    () => assertNoProductResetDependencies(['Inventory']),
    (error) => error.code === 'DEMO_PRODUCT_RESET_DEPENDENCY',
  );
  assert.doesNotThrow(() => assertNoProductResetDependencies([]));
});

async function inventoryFixture(threshold = 5) {
  const { manifest, registry, clock, categories } = await categoryFixture();
  const productResult = validateProductDefinitions({
    manifest,
    registry,
    categories,
  });
  const inventoryResult = await validateInventoryDefinitions({
    definitions: productResult.definitions,
    registry,
    clock,
    threshold,
  });

  return {
    manifest,
    registry,
    clock,
    definitions: productResult.definitions,
    ...inventoryResult,
  };
}

test('demo Inventory threshold is seed-side parsed and must be positive', () => {
  assert.equal(resolveSeedLowStockThreshold({}), 5);
  assert.equal(resolveSeedLowStockThreshold({ LOW_STOCK_THRESHOLD: '7' }), 7);

  for (const value of ['0', '-1', '1.5', 'invalid']) {
    assert.throws(
      () =>
        resolveSeedLowStockThreshold({
          LOW_STOCK_THRESHOLD: value,
        }),
      (error) =>
        [
          'DEMO_INVENTORY_THRESHOLD_INVALID',
          'DEMO_INVENTORY_THRESHOLD_ZERO',
        ].includes(error.code),
    );
  }
});

test('Inventory registry plan contains exact position and adjustment identities', async () => {
  const { manifest, registry } = await inventoryFixture();
  const plan = buildInventoryRegistryPlan(manifest);
  const inventoryKeys = plan.map((position) => position.inventoryKey);
  const adjustmentKeys = plan.flatMap(
    (position) => position.adjustmentKeys,
  );

  assert.equal(plan.length, 105);
  assert.equal(
    plan.filter((position) => position.productType === 'simple').length,
    21,
  );
  assert.equal(
    plan.filter((position) => position.productType === 'variant').length,
    84,
  );
  assert.equal(adjustmentKeys.length, 104);
  assert.equal(new Set(inventoryKeys).size, 105);
  assert.equal(new Set(adjustmentKeys).size, 104);
  assert.deepEqual(registry.keysByEntity.inventory, inventoryKeys);
  assert.deepEqual(registry.keysByEntity.inventoryAdjustments, adjustmentKeys);
});

test('Inventory definitions have 21 simple and 84 exact Variant positions', async () => {
  const { positions } = await inventoryFixture();
  const simple = positions.filter(
    (position) => position.productType === 'simple',
  );
  const variant = positions.filter(
    (position) => position.productType === 'variant',
  );
  const naturalIdentities = positions.map(naturalInventoryIdentity);

  assert.equal(positions.length, 105);
  assert.equal(simple.length, 21);
  assert.equal(variant.length, 84);
  assert.ok(simple.every((position) => !Object.hasOwn(position, 'variantId')));
  assert.ok(variant.every((position) => Object.hasOwn(position, 'variantId')));
  assert.equal(new Set(naturalIdentities).size, 105);
});

test('Inventory quantities lock position and public Product stock distributions', async () => {
  const threshold = 5;
  const { positions, counts } = await inventoryFixture(threshold);

  assert.deepEqual(counts.stock, {
    out_of_stock: 25,
    low_stock: 26,
    in_stock: 54,
  });
  assert.deepEqual(counts.publicStock, {
    out_of_stock: 4,
    low_stock: 5,
    in_stock: 29,
  });
  assert.ok(
    positions.every(
      (position) =>
        getSeedStockState(position.quantity, threshold) === position.stockState,
    ),
  );
  assert.equal(
    positions.filter(
      (position) =>
        position.productType === 'variant' &&
        position.variantActive === false &&
        position.quantity > threshold,
    ).length,
    21,
  );
});

test('foundational InventoryAdjustment ledger has exact reasons and ownership', async () => {
  const { adjustments, counts, registry } = await inventoryFixture();
  const adminId = registry.idFor('user:admin').toString();

  assert.equal(adjustments.length, 104);
  assert.deepEqual(counts.reasons, {
    initial_stock: 85,
    restock: 8,
    manual_correction: 11,
    order_purchase: 0,
    order_cancellation: 0,
    refund_return: 0,
  });
  assert.ok(
    adjustments.every(
      (adjustment) =>
        !Object.hasOwn(adjustment, 'sourceType') &&
        !Object.hasOwn(adjustment, 'sourceId'),
    ),
  );
  assert.ok(
    adjustments
      .filter(
        (adjustment) =>
          adjustment.reason === INVENTORY_ADJUSTMENT_REASONS.INITIAL_STOCK,
      )
      .every((adjustment) => !Object.hasOwn(adjustment, 'performedBy')),
  );
  assert.ok(
    adjustments
      .filter((adjustment) =>
        [
          INVENTORY_ADJUSTMENT_REASONS.RESTOCK,
          INVENTORY_ADJUSTMENT_REASONS.MANUAL_CORRECTION,
        ].includes(adjustment.reason),
      )
      .every((adjustment) => adjustment.performedBy.toString() === adminId),
  );
  assert.ok(
    adjustments
      .filter(
        (adjustment) =>
          adjustment.reason ===
          INVENTORY_ADJUSTMENT_REASONS.MANUAL_CORRECTION,
      )
      .every(
        (adjustment) =>
          adjustment.note === DEMO_INVENTORY_RECONCILIATION_NOTE,
      ),
  );
});

test('Inventory and adjustment IDs are deterministic and ledgers reconcile', async () => {
  const { positions, adjustments, counts } = await inventoryFixture();
  const inventoryIds = positions.map((position) => position._id.toString());
  const adjustmentIds = adjustments.map((adjustment) =>
    adjustment._id.toString(),
  );

  assert.equal(new Set(inventoryIds).size, 105);
  assert.equal(new Set(adjustmentIds).size, 104);
  assert.equal(reconcileInventoryLedgers(positions), 105);
  assert.equal(counts.reconciled, 105);
  assert.ok(
    positions.every(
      (position) =>
        position.createdAt > position.productCreatedAt &&
        (position.adjustments.length === 0 ||
          position.adjustments[0].createdAt > position.createdAt),
    ),
  );
});

test('Inventory preflight classification covers missing and exact ledgers', async () => {
  const { positions } = await inventoryFixture();
  const expected = positions[0];

  assert.equal(
    classifyInventoryPosition({ expected }).classification,
    INVENTORY_CLASSIFICATIONS.MISSING,
  );
  assert.equal(
    classifyInventoryPosition({
      expected,
      recordById: expected,
      recordByNaturalIdentity: expected,
      existingAdjustments: expected.adjustments,
    }).classification,
    INVENTORY_CLASSIFICATIONS.EXACT,
  );
});

test('Inventory preflight rejects natural key, deterministic ID, and quantity conflicts', async () => {
  const { positions } = await inventoryFixture();
  const expected = positions[0];

  assert.equal(
    classifyInventoryPosition({
      expected,
      recordByNaturalIdentity: {
        ...expected,
        _id: deterministicObjectId('conflict:inventory:natural'),
      },
    }).classification,
    INVENTORY_CLASSIFICATIONS.NATURAL_KEY_CONFLICT,
  );
  assert.equal(
    classifyInventoryPosition({
      expected,
      recordById: {
        ...expected,
        productId: deterministicObjectId('conflict:inventory:product'),
      },
    }).classification,
    INVENTORY_CLASSIFICATIONS.ID_CONFLICT,
  );
  assert.equal(
    classifyInventoryPosition({
      expected,
      recordById: { ...expected, quantity: expected.quantity + 1 },
      recordByNaturalIdentity: expected,
      existingAdjustments: expected.adjustments,
    }).classification,
    INVENTORY_CLASSIFICATIONS.DRIFT,
  );
});

test('Inventory preflight rejects missing, changed, or extra ledger history', async () => {
  const { positions } = await inventoryFixture();
  const expected = positions.find((position) => position.adjustments.length > 0);
  const changedAdjustment = {
    ...expected.adjustments[0],
    quantityChange: expected.adjustments[0].quantityChange + 1,
  };
  const extraAdjustment = {
    ...expected.adjustments[0],
    _id: deterministicObjectId('conflict:inventory:extra-adjustment'),
  };

  for (const existingAdjustments of [
    [],
    [changedAdjustment, ...expected.adjustments.slice(1)],
    [...expected.adjustments, extraAdjustment],
  ]) {
    assert.equal(
      classifyInventoryPosition({
        expected,
        recordById: expected,
        recordByNaturalIdentity: expected,
        existingAdjustments,
      }).classification,
      INVENTORY_CLASSIFICATIONS.DRIFT,
    );
  }
});

test('unchanged second-run Inventory classifications require zero creation', async () => {
  const { positions } = await inventoryFixture();
  const results = positions.map((expected) =>
    classifyInventoryPosition({
      expected,
      recordById: expected,
      recordByNaturalIdentity: expected,
      existingAdjustments: expected.adjustments,
    }),
  );

  assert.equal(
    results.filter(
      (result) => result.classification === INVENTORY_CLASSIFICATIONS.MISSING,
    ).length,
    0,
  );
  assert.ok(
    results.every(
      (result) => result.classification === INVENTORY_CLASSIFICATIONS.EXACT,
    ),
  );
});

test('Inventory reset ownership is exact and adjustments precede positions', async () => {
  const { positions } = await inventoryFixture();
  const simple = positions.find(
    (position) => position.productType === 'simple',
  );
  const variant = positions.find(
    (position) => position.productType === 'variant',
  );
  const filter = exactInventoryOwnershipFilter([simple, variant]);

  assert.deepEqual(INVENTORY_RESET_ORDER, [
    'inventoryAdjustments',
    'inventory',
  ]);
  assert.equal(filter.$or.length, 2);
  assert.deepEqual(filter.$or[0].variantId, { $exists: false });
  assert.equal(filter.$or[1].variantId.toString(), variant.variantId.toString());
  assert.equal(filter.$or[0]._id.toString(), simple._id.toString());
  assert.equal(filter.$or[1]._id.toString(), variant._id.toString());
});

async function couponFixture() {
  const manifest = await loadAndValidateProductManifest();
  const registry = createSeedRegistry(manifest);
  const clock = createSeedClock({
    anchorDate: '2026-08-22',
    timeZone: 'Asia/Kolkata',
  });
  const result = await validateCouponDefinitions({ registry, clock });

  return { manifest, registry, clock, ...result };
}

test('Coupon registry replaces every old placeholder with the eight locked codes', async () => {
  const { registry } = await couponFixture();
  const expectedCodes = [
    'DEMO10',
    'SAVE500',
    'MAX20',
    'INACTIVE15',
    'EXPIRED12',
    'NEXTWEEK15',
    'USEDUP250',
    'LIMITED5',
  ];
  const registeredCodes = DEMO_COUPON_IDENTITIES.map(
    (identity) => identity.code,
  );

  assert.deepEqual(registeredCodes, expectedCodes);
  assert.deepEqual(
    registry.keysByEntity.coupons,
    expectedCodes.map((code) => `coupon:${code}`),
  );
  assert.ok(
    LEGACY_DEMO_COUPON_CODES.every(
      (code) => !registeredCodes.includes(code),
    ),
  );
  assert.equal(new Set(registry.keysByEntity.coupons).size, 8);
});

test('Coupon definitions lock exact configuration and scenario totals', async () => {
  const { coupons, counts } = await couponFixture();

  assert.equal(COUPON_DEFINITIONS.length, 8);
  assert.deepEqual(counts, {
    coupons: 8,
    percentage: 6,
    fixed: 2,
    active: 7,
    inactive: 1,
    unlimited: 6,
    limited: 2,
    exhausted: 1,
    partiallyUsedLimited: 1,
    maximumDiscount: 1,
    upcoming: 1,
    expired: 1,
  });
  assert.equal(new Set(coupons.map((coupon) => coupon.code)).size, 8);
  assert.ok(
    coupons.every(
      (coupon) =>
        Number.isSafeInteger(coupon.minimumOrderAmount) &&
        coupon.minimumOrderAmount >= 0 &&
        coupon.code === coupon.code.trim().toUpperCase(),
    ),
  );
  assert.equal(
    coupons.filter((coupon) => coupon.maximumDiscount !== null).length,
    1,
  );
  assert.equal(
    coupons.find((coupon) => coupon.code === 'USEDUP250').usedCount,
    4,
  );
  assert.equal(
    coupons.find((coupon) => coupon.code === 'LIMITED5').usedCount,
    3,
  );
});

test('Coupon dates and timestamps are deterministic relative to the anchor', async () => {
  const { coupons, clock } = await couponFixture();
  const expired = coupons.find((coupon) => coupon.code === 'EXPIRED12');
  const upcoming = coupons.find((coupon) => coupon.code === 'NEXTWEEK15');

  assert.ok(expired.startsAt < expired.expiresAt);
  assert.ok(expired.expiresAt < clock.anchorTime);
  assert.ok(upcoming.startsAt > clock.anchorTime);
  assert.ok(upcoming.startsAt < upcoming.expiresAt);
  assert.ok(
    coupons.every(
      (coupon) =>
        coupon.createdAt instanceof Date &&
        coupon.createdAt.toISOString() === coupon.updatedAt.toISOString(),
    ),
  );
  assert.equal(
    clock.daysAfter(7).toISOString(),
    createSeedClock({
      anchorDate: '2026-08-29',
      timeZone: 'Asia/Kolkata',
    }).anchorTime.toISOString(),
  );
});

test('Coupon preflight classification covers missing and exact records', async () => {
  const { coupons } = await couponFixture();
  const expected = coupons[0];

  assert.equal(
    classifyCouponRecord({ expected }).classification,
    COUPON_CLASSIFICATIONS.MISSING,
  );
  assert.equal(
    classifyCouponRecord({
      expected,
      recordById: expected,
      recordByCode: expected,
    }).classification,
    COUPON_CLASSIFICATIONS.EXACT,
  );
});

test('Coupon preflight detects code, ID, configuration, usage, and timestamp drift', async () => {
  const { coupons } = await couponFixture();
  const expected = coupons[0];

  assert.equal(
    classifyCouponRecord({
      expected,
      recordByCode: {
        ...expected,
        _id: deterministicObjectId('conflict:coupon:code'),
      },
    }).classification,
    COUPON_CLASSIFICATIONS.CODE_CONFLICT,
  );
  assert.equal(
    classifyCouponRecord({
      expected,
      recordById: { ...expected, code: 'ANOTHER' },
    }).classification,
    COUPON_CLASSIFICATIONS.ID_CONFLICT,
  );

  for (const existing of [
    { ...expected, discountValue: expected.discountValue + 1 },
    { ...expected, usedCount: expected.usedCount + 1 },
    {
      ...expected,
      updatedAt: new Date(expected.updatedAt.getTime() + 1000),
    },
  ]) {
    assert.equal(
      classifyCouponRecord({
        expected,
        recordById: existing,
        recordByCode: existing,
      }).classification,
      COUPON_CLASSIFICATIONS.DRIFT,
    );
  }
});

test('legacy Coupon placeholder persistence is detected before ownership changes', () => {
  const records = [
    {
      _id: deterministicObjectId('coupon:WELCOME10'),
      code: 'WELCOME10',
    },
  ];

  assert.equal(findLegacyCouponPlaceholders(records).length, 1);
  assert.equal(
    findLegacyCouponPlaceholders([
      {
        _id: deterministicObjectId('unrelated:coupon'),
        code: 'UNRELATED',
      },
    ]).length,
    0,
  );
});

test('Coupon pricing uses existing service arithmetic for all successful scenarios', async () => {
  const { coupons, clock } = await couponFixture();
  const byCode = new Map(coupons.map((coupon) => [coupon.code, coupon]));
  const expectedPricing = {
    DEMO10: { discountAmount: 50000, totalAmount: 450000 },
    SAVE500: { discountAmount: 50000, totalAmount: 450000 },
    MAX20: { discountAmount: 75000, totalAmount: 425000 },
    LIMITED5: { discountAmount: 25000, totalAmount: 475000 },
  };

  for (const [code, expected] of Object.entries(expectedPricing)) {
    const beforeUsedCount = byCode.get(code).usedCount;
    const result = validateCouponForSubtotal({
      coupon: byCode.get(code),
      subtotal: 500000,
      now: clock.anchorTime,
    });

    assert.equal(result.discountAmount, expected.discountAmount);
    assert.equal(result.totalAmount, expected.totalAmount);
    assert.equal(byCode.get(code).usedCount, beforeUsedCount);
  }
});

test('Coupon service preserves exact inactive, date, usage, and minimum errors', async () => {
  const { coupons, clock } = await couponFixture();
  const byCode = new Map(coupons.map((coupon) => [coupon.code, coupon]));
  const scenarios = [
    ['INACTIVE15', 500000, 'COUPON_INACTIVE'],
    ['EXPIRED12', 500000, 'COUPON_EXPIRED'],
    ['NEXTWEEK15', 500000, 'COUPON_NOT_STARTED'],
    ['USEDUP250', 500000, 'COUPON_USAGE_LIMIT_REACHED'],
    ['SAVE500', 299899, 'COUPON_MINIMUM_NOT_MET'],
  ];

  for (const [code, subtotal, errorCode] of scenarios) {
    assert.throws(
      () =>
        validateCouponForSubtotal({
          coupon: byCode.get(code),
          subtotal,
          now: clock.anchorTime,
        }),
      (error) => error.code === errorCode,
    );
  }
});

test('Coupon reset filter is exact and dependency conflicts are refused', async () => {
  const { coupons } = await couponFixture();
  const expected = coupons[0];

  assert.deepEqual(exactCouponOwnershipFilter([expected]), {
    $or: [{ _id: expected._id, code: expected.code }],
  });
  assert.throws(
    () => assertNoCouponResetDependencies(['Cart']),
    (error) => error.code === 'DEMO_COUPON_RESET_DEPENDENCY',
  );
  assert.doesNotThrow(() => assertNoCouponResetDependencies([]));
});

test('exact Coupon second-run classification does not mutate usage counters', async () => {
  const { coupons } = await couponFixture();
  const beforeUsage = coupons.map((coupon) => coupon.usedCount);
  const results = coupons.map((expected) =>
    classifyCouponRecord({
      expected,
      recordById: expected,
      recordByCode: expected,
    }),
  );

  assert.ok(
    results.every(
      (result) => result.classification === COUPON_CLASSIFICATIONS.EXACT,
    ),
  );
  assert.deepEqual(
    coupons.map((coupon) => coupon.usedCount),
    beforeUsage,
  );
});

test('locked User definitions contain the exact role and identity counts', () => {
  assert.equal(DEMO_USER_DEFINITIONS.length, 8);
  assert.equal(
    DEMO_USER_DEFINITIONS.filter((user) => user.role === 'admin').length,
    1,
  );
  assert.equal(
    DEMO_USER_DEFINITIONS.filter((user) => user.role === 'customer').length,
    7,
  );
  assert.ok(DEMO_USER_DEFINITIONS.every((user) => user.emailVerified));
  assert.equal(
    new Set(DEMO_USER_DEFINITIONS.map((user) => user.email)).size,
    8,
  );
  assert.ok(
    DEMO_USER_DEFINITIONS.every(
      (user) =>
        !Object.hasOwn(user, 'googleSub') &&
        !Object.hasOwn(user, 'profilePhoto'),
    ),
  );
  assert.deepEqual(
    DEMO_USER_IDENTITIES.map(({ key, email }) => ({ key, email })),
    DEMO_USER_DEFINITIONS.map(({ seedKey, email }) => ({
      key: seedKey,
      email,
    })),
  );
});

test('embedded Address definitions have locked counts and defaults', () => {
  const counts = Object.fromEntries(
    DEMO_USER_DEFINITIONS.map((user) => [user.seedKey, user.addresses.length]),
  );
  const addresses = DEMO_USER_DEFINITIONS.flatMap((user) => user.addresses);

  assert.deepEqual(counts, {
    'user:admin': 0,
    'user:fresh': 0,
    'user:checkout': 2,
    'user:orders': 2,
    'user:reviews': 1,
    'user:ratings': 1,
    'user:refunds': 1,
    'user:support': 1,
  });
  assert.equal(addresses.length, 8);
  assert.equal(new Set(addresses.map((item) => item.seedKey)).size, 8);
  assert.deepEqual(
    new Set(addresses.map((item) => item.seedKey)),
    new Set(DEMO_ADDRESS_KEYS),
  );

  for (const user of DEMO_USER_DEFINITIONS.filter(
    (candidate) => candidate.addresses.length > 0,
  )) {
    assert.equal(
      user.addresses.filter((item) => item.isDefault).length,
      1,
    );
  }
});

test('User and Address IDs validate through the registry and User schema', async () => {
  const manifest = await loadAndValidateProductManifest();
  const registry = createSeedRegistry(manifest);
  const clock = createSeedClock({
    anchorDate: '2026-08-22',
    timeZone: 'Asia/Kolkata',
  });
  const users = await validateDemoUserDefinitions({ registry, clock });
  const allIds = users.flatMap((user) => [
    user._id.toString(),
    ...user.addresses.map((item) => item._id.toString()),
  ]);

  assert.equal(users.length, 8);
  assert.equal(allIds.length, 16);
  assert.equal(new Set(allIds).size, 16);
  assert.equal(
    users.flatMap((user) => user.addresses).length,
    8,
  );
});

test('demo password validation matches the application registration policy', () => {
  assert.equal(validateDemoSeedPassword('DemoPass123'), 'DemoPass123');

  for (const invalid of [
    'short1',
    'onlyletters',
    '12345678',
    `A1${'x'.repeat(127)}`,
  ]) {
    assert.throws(
      () => validateDemoSeedPassword(invalid),
      (error) => error.code === 'DEMO_SEED_PASSWORD_INVALID',
    );
  }
});

test('Argon2id password verification is semantic rather than hash-string based', async () => {
  const password = 'DemoPass123';
  const first = await argon2.hash(password, { type: argon2.argon2id });
  const second = await argon2.hash(password, { type: argon2.argon2id });

  assert.notEqual(first, second);
  assert.equal(await argon2.verify(first, password), true);
  assert.equal(await argon2.verify(second, password), true);
});

async function classificationFixture() {
  const manifest = await loadAndValidateProductManifest();
  const registry = createSeedRegistry(manifest);
  const clock = createSeedClock({
    anchorDate: '2026-08-22',
    timeZone: 'Asia/Kolkata',
  });
  const [expected] = buildExpectedDemoUsers({ registry, clock });
  const exact = {
    ...expected,
    addresses: expected.addresses.map((item) => ({ ...item })),
    passwordHash: 'not-compared-as-a-string',
  };

  return { expected, exact };
}

test('User preflight classification covers missing and exact records', async () => {
  const { expected, exact } = await classificationFixture();

  assert.equal(
    classifyDemoUserRecord({ expected }).classification,
    DEMO_USER_CLASSIFICATIONS.MISSING,
  );
  assert.equal(
    classifyDemoUserRecord({
      expected,
      recordById: exact,
      recordByEmail: exact,
      passwordMatches: true,
    }).classification,
    DEMO_USER_CLASSIFICATIONS.EXACT,
  );
});

test('User preflight classification detects email and ID conflicts', async () => {
  const { expected } = await classificationFixture();

  assert.equal(
    classifyDemoUserRecord({
      expected,
      recordByEmail: {
        _id: deterministicObjectId('conflict:email'),
        email: expected.email,
      },
    }).classification,
    DEMO_USER_CLASSIFICATIONS.EMAIL_CONFLICT,
  );
  assert.equal(
    classifyDemoUserRecord({
      expected,
      recordById: {
        _id: expected._id,
        email: 'another@example.test',
      },
    }).classification,
    DEMO_USER_CLASSIFICATIONS.ID_CONFLICT,
  );
});

test('User preflight classification detects field and password drift', async () => {
  const { expected, exact } = await classificationFixture();
  const fieldDrift = classifyDemoUserRecord({
    expected,
    recordById: { ...exact, name: 'Changed Name' },
    passwordMatches: true,
  });
  const passwordDrift = classifyDemoUserRecord({
    expected,
    recordById: exact,
    passwordMatches: false,
  });

  assert.equal(fieldDrift.classification, DEMO_USER_CLASSIFICATIONS.DRIFT);
  assert.ok(fieldDrift.driftFields.includes('name'));
  assert.equal(passwordDrift.classification, DEMO_USER_CLASSIFICATIONS.DRIFT);
  assert.ok(passwordDrift.driftFields.includes('passwordHash'));
});

test('selective reset filter uses exact deterministic ID/email pairs', async () => {
  const { expected } = await classificationFixture();
  const filter = exactDemoUserPairFilter([expected]);

  assert.deepEqual(filter, {
    $or: [{ _id: expected._id, email: expected.email }],
  });
  assert.equal(Object.hasOwn(filter, 'role'), false);
});

test('scenario clock remains stable during one execution', () => {
  const clock = createSeedClock({
    anchorDate: '2026-08-22',
    timeZone: 'Asia/Kolkata',
  });

  assert.equal(clock.anchorDate, '2026-08-22');
  assert.equal(clock.anchorTime.toISOString(), clock.anchorTime.toISOString());
  assert.equal(clock.daysAgo(5).toISOString(), clock.daysAgo(5).toISOString());
  assert.equal(
    clock.monthsAgo(2).toISOString(),
    clock.monthsAgo(2).toISOString(),
  );

  const ordered = clock.orderedTimestamps(3, { stepMilliseconds: 500 });

  assert.deepEqual(
    ordered.map((value) => value.getTime()),
    [
      clock.anchorTime.getTime(),
      clock.anchorTime.getTime() + 500,
      clock.anchorTime.getTime() + 1000,
    ],
  );

  const monthEndClock = createSeedClock({
    anchorDate: '2024-03-31',
    timeZone: 'Asia/Kolkata',
  });

  assert.equal(
    monthEndClock.monthsAgo(1).toISOString(),
    monthEndClock.localDateTime({
      year: 2024,
      month: 2,
      day: 29,
    }).toISOString(),
  );

  assert.equal(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(clock.atLocalTime(clock.daysAgo(1), { hour: 10 })),
    '10',
  );
});

async function cartFixture() {
  const manifest = await loadAndValidateProductManifest();
  const registry = createSeedRegistry(manifest);
  const clock = createSeedClock({
    anchorDate: '2026-08-22',
    timeZone: 'Asia/Kolkata',
  });
  const categories = await validateCategoryDefinitions({
    registry,
    clock,
    manifest,
  });
  const products = validateProductDefinitions({
    manifest,
    registry,
    categories,
  });
  const inventory = await validateInventoryDefinitions({
    definitions: products.definitions,
    registry,
    clock,
    threshold: 5,
  });
  const coupons = await validateCouponDefinitions({ registry, clock });
  const carts = await validateCartDefinitions({ registry, clock });

  return {
    manifest,
    registry,
    clock,
    categories,
    products,
    inventory,
    coupons,
    ...carts,
  };
}

test('Cart registry contains only three persisted Carts and six embedded items', async () => {
  const { registry } = await cartFixture();

  assert.deepEqual(registry.keysByEntity.carts, [
    'cart:user:checkout',
    'cart:user:orders',
    'cart:user:support',
  ]);
  assert.deepEqual(registry.keysByEntity.cartItems, [
    'cart-item:user:checkout:01',
    'cart-item:user:checkout:02',
    'cart-item:user:checkout:03',
    'cart-item:user:orders:01',
    'cart-item:user:orders:02',
    'cart-item:user:support:01',
  ]);
  assert.equal(
    registry.entries.filter((entry) =>
      [...LEGACY_CART_KEYS].includes(entry.key),
    ).length,
    0,
  );
  assert.equal(
    new Set(
      [...registry.keysByEntity.carts, ...registry.keysByEntity.cartItems].map(
        (key) => registry.idFor(key).toString(),
      ),
    ).size,
    9,
  );
});

test('Cart definitions lock exact owners, item distribution, variants, and timestamps', async () => {
  const { carts, counts, registry } = await cartFixture();

  assert.equal(CART_DEFINITIONS.length, 3);
  assert.deepEqual(counts, {
    carts: 3,
    items: 6,
    simpleItems: 2,
    variantItems: 4,
  });
  assert.deepEqual(
    carts.map((cart) => cart.customerSeedKey),
    ['user:checkout', 'user:orders', 'user:support'],
  );
  assert.deepEqual(
    carts.map((cart) => cart.items.length),
    [3, 2, 1],
  );
  assert.equal(carts[0].appliedCouponSeedKey, 'coupon:DEMO10');
  assert.equal(carts[1].appliedCouponId, null);
  assert.equal(carts[2].appliedCouponId, null);
  assert.ok(
    carts
      .flatMap((cart) => cart.items)
      .filter((item) => item.variantSeedKey === null)
      .every((item) => item.variantId === null),
  );
  assert.equal(
    carts[2].items[0].variantId.toString(),
    registry
      .idFor('variant:product:running:temporun-daily-trainers:04')
      .toString(),
  );
  assert.deepEqual(
    carts.map((cart) => cart.createdAt.toISOString()),
    [
      '2026-08-21T04:30:00.000Z',
      '2026-08-19T04:30:00.000Z',
      '2026-08-20T04:30:00.000Z',
    ],
  );
  assert.deepEqual(CART_FREE_USER_KEYS, [
    'user:admin',
    'user:fresh',
    'user:reviews',
    'user:ratings',
    'user:refunds',
  ]);
});

test('locked Cart Products, support availability, Inventory, and pricing remain exact', async () => {
  const { carts, products, inventory, coupons, registry, clock } =
    await cartFixture();
  const productsByKey = new Map(
    products.definitions.map((product) => [product.seedKey, product]),
  );
  const totals = new Map();

  for (const item of carts.flatMap((cart) => cart.items)) {
    const product = productsByKey.get(item.productSeedKey);
    totals.set(item.seedKey, getCurrentProductPrice(product) * item.quantity);
  }

  const checkoutSubtotal = carts[0].items.reduce(
    (total, item) => total + totals.get(item.seedKey),
    0,
  );
  const ordersSubtotal = carts[1].items.reduce(
    (total, item) => total + totals.get(item.seedKey),
    0,
  );
  const demo10 = coupons.coupons.find((coupon) => coupon.code === 'DEMO10');
  const couponResult = validateCouponForSubtotal({
    coupon: demo10,
    subtotal: checkoutSubtotal,
    now: clock.anchorTime,
  });
  const supportProduct = productsByKey.get(
    'product:running:temporun-daily-trainers',
  );
  const supportVariant = supportProduct.variants.find(
    (variant) =>
      variant._id.toString() ===
      registry
        .idFor('variant:product:running:temporun-daily-trainers:04')
        .toString(),
  );
  const supportInventory = inventory.positions.find(
    (position) =>
      position.seedKey ===
      'inventory:product:running:temporun-daily-trainers:variant:04',
  );

  assert.equal(checkoutSubtotal, 629610);
  assert.equal(couponResult.discountAmount, 62961);
  assert.equal(couponResult.totalAmount, 566649);
  assert.equal(ordersSubtotal, 1499800);
  assert.equal(supportProduct.isActive, true);
  assert.equal(supportVariant.isActive, false);
  assert.ok(supportInventory.quantity > 5);
  assert.equal(supportInventory.variantActive, false);
});

test('Cart classification covers missing, exact, Customer conflict, and ID conflict', async () => {
  const { carts } = await cartFixture();
  const expected = carts[0];

  assert.equal(
    classifyCartRecord({ expected }).classification,
    CART_CLASSIFICATIONS.MISSING,
  );
  assert.equal(
    classifyCartRecord({
      expected,
      recordById: expected,
      recordByCustomer: expected,
    }).classification,
    CART_CLASSIFICATIONS.EXACT,
  );
  assert.equal(
    classifyCartRecord({
      expected,
      recordByCustomer: {
        ...expected,
        _id: deterministicObjectId('conflict:cart:customer'),
      },
    }).classification,
    CART_CLASSIFICATIONS.CUSTOMER_CONFLICT,
  );
  assert.equal(
    classifyCartRecord({
      expected,
      recordById: {
        ...expected,
        customerId: deterministicObjectId('conflict:cart:id'),
      },
    }).classification,
    CART_CLASSIFICATIONS.ID_CONFLICT,
  );
});

test('Cart classification rejects item, quantity, Coupon, timestamp, and item-set drift', async () => {
  const { carts } = await cartFixture();
  const expected = carts[0];
  const drifted = [
    {
      ...expected,
      items: [
        { ...expected.items[0], productId: deterministicObjectId('drift:product') },
        ...expected.items.slice(1),
      ],
    },
    {
      ...expected,
      items: [
        { ...expected.items[0], quantity: 9 },
        ...expected.items.slice(1),
      ],
    },
    { ...expected, appliedCouponId: null },
    { ...expected, updatedAt: new Date(expected.updatedAt.getTime() + 1) },
    { ...expected, items: expected.items.slice(1) },
    {
      ...expected,
      items: [
        ...expected.items,
        {
          ...expected.items[0],
          _id: deterministicObjectId('drift:cart-item'),
        },
      ],
    },
  ];

  for (const record of drifted) {
    assert.equal(
      classifyCartRecord({
        expected,
        recordById: record,
        recordByCustomer: record,
      }).classification,
      CART_CLASSIFICATIONS.DRIFT,
    );
  }
});

test('Cart preflight accepts exact state and rejects legacy or Cart-free ownership', async () => {
  const { carts, registry } = await cartFixture();
  const exact = await preflightCarts({
    expectedCarts: carts,
    registry,
    records: carts,
  });

  assert.ok(
    exact.every(
      (result) => result.classification === CART_CLASSIFICATIONS.EXACT,
    ),
  );
  await assert.rejects(
    preflightCarts({
      expectedCarts: carts,
      registry,
      records: [
        ...carts,
        {
          _id: deterministicObjectId('cart:user:fresh'),
          customerId: deterministicObjectId('unrelated:customer'),
        },
      ],
    }),
    (error) => error.code === 'DEMO_SEED_DRIFT',
  );
  await assert.rejects(
    preflightCarts({
      expectedCarts: carts,
      registry,
      records: [
        ...carts,
        {
          _id: deterministicObjectId('unrelated:cart'),
          customerId: registry.idFor('user:admin'),
        },
      ],
    }),
    (error) => error.code === 'DEMO_SEED_DRIFT',
  );
});

test('Cart resolution and Checkout preview guards encode exact valid/stale outcomes', () => {
  const checkoutPricing = {
    subtotal: 629610,
    discountAmount: 62961,
    totalAmount: 566649,
  };
  const ordersPricing = {
    subtotal: 1499800,
    discountAmount: 0,
    totalAmount: 1499800,
  };
  const staleIssue = { code: 'CART_ITEM_UNAVAILABLE', message: 'stale' };

  assert.doesNotThrow(() =>
    assertResolvedCartScenarios({
      checkout: {
        items: [{}, {}, {}],
        issues: [],
        warnings: [],
        canCheckout: true,
        coupon: { code: 'DEMO10' },
        pricing: checkoutPricing,
      },
      orders: {
        items: [{}, {}],
        issues: [],
        warnings: [],
        canCheckout: true,
        coupon: null,
        pricing: ordersPricing,
      },
      support: {
        items: [
          {
            issues: [staleIssue],
            availability: { isAvailable: false },
          },
        ],
        issues: [{ cartItemId: 'item', ...staleIssue }],
        warnings: [],
        canCheckout: false,
      },
    }),
  );
  assert.doesNotThrow(() =>
    assertCheckoutPreviewScenarios({
      checkout: {
        preview: { canProceed: true },
        checkoutSnapshot: {
          items: [{}, {}, {}],
          coupon: { code: 'DEMO10' },
          ...checkoutPricing,
        },
      },
      orders: {
        preview: { canProceed: true },
        checkoutSnapshot: {
          items: [{}, {}],
          coupon: null,
          ...ordersPricing,
        },
      },
      support: {
        preview: { canProceed: false, issues: [staleIssue] },
        checkoutSnapshot: null,
      },
    }),
  );
});

test('Cart selective reset filter is exact and never broad', async () => {
  const { carts } = await cartFixture();
  const filter = exactCartOwnershipFilter(carts);

  assert.equal(filter.$or.length, 3);
  assert.deepEqual(
    filter.$or.map((entry) => Object.keys(entry).sort()),
    [
      ['_id', 'customerId'],
      ['_id', 'customerId'],
      ['_id', 'customerId'],
    ],
  );
  assert.equal(Object.hasOwn(filter, 'role'), false);
  assert.equal(JSON.stringify(filter).includes('deleteMany({})'), false);
});

let historicalCommerceFixturePromise;

async function historicalCommerceFixture() {
  historicalCommerceFixturePromise ??= (async () => {
    const manifest = await loadAndValidateProductManifest();
    const registry = createSeedRegistry(manifest);
    const clock = createSeedClock({
      anchorDate: '2026-08-22',
      timeZone: 'Asia/Kolkata',
    });
    const users = await validateDemoUserDefinitions({ registry, clock });
    const categories = await validateCategoryDefinitions({
      registry,
      clock,
      manifest,
    });
    const products = validateProductDefinitions({
      manifest,
      registry,
      categories,
    });
    const inventory = await validateInventoryDefinitions({
      definitions: products.definitions,
      registry,
      clock,
      threshold: 5,
    });
    const coupons = await validateCouponDefinitions({ registry, clock });
    const matrix = await validateHistoricalCommerceScenarioMatrix({
      registry,
      clock,
      productDefinitions: products.definitions,
      categories,
      users,
      coupons: coupons.coupons,
      inventoryPositions: inventory.positions,
      lowStockThreshold: 5,
    });

    return {
      manifest,
      registry,
      clock,
      users,
      categories,
      products,
      inventory,
      coupons,
      matrix,
    };
  })();

  return historicalCommerceFixturePromise;
}

test('historical commerce registry locks 46 semantic Payments, 42 Orders, and 53 item IDs', async () => {
  const { registry } = await historicalCommerceFixture();

  assert.equal(registry.counts.payments, 46);
  assert.equal(registry.counts.orders, 42);
  assert.equal(registry.counts.commerceItems, 53);
  assert.equal(registry.keysByEntity.payments[0], 'payment:order:01');
  assert.equal(registry.keysByEntity.payments[41], 'payment:order:42');
  assert.deepEqual(registry.keysByEntity.payments.slice(-4), [
    'payment:abandoned:01',
    'payment:abandoned:02',
    'payment:system-compensation:01',
    'payment:system-compensation:02',
  ]);
  assert.equal(registry.keysByEntity.orders[0], 'order:historical:01');
  assert.equal(registry.keysByEntity.orders.at(-1), 'order:historical:42');
  assert.equal(
    new Set(
      [
        ...registry.keysByEntity.payments,
        ...registry.keysByEntity.orders,
        ...registry.keysByEntity.commerceItems,
      ].map((key) => registry.idFor(key).toString()),
    ).size,
    141,
  );
});

test('historical matrix corrects the provisional 45 target to exact 42/2/2 Payments', async () => {
  const { matrix } = await historicalCommerceFixture();
  const payments = buildHistoricalPaymentDefinitions(matrix);
  const orders = buildHistoricalOrderDefinitions(matrix);

  assert.equal(payments.length, 46);
  assert.equal(orders.length, 42);
  assert.deepEqual(matrix.counts, {
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
  });
  assert.equal(
    payments.filter(
      (payment) =>
        payment.kind === 'order' && payment.status === 'succeeded',
    ).length,
    42,
  );
  assert.equal(
    payments.filter(
      (payment) =>
        payment.kind === 'abandoned' && payment.status === 'created',
    ).length,
    2,
  );
  assert.equal(
    payments.filter(
      (payment) =>
        payment.kind === 'system_compensation' &&
        payment.status === 'succeeded',
    ).length,
    2,
  );
});

test('historical customer, status, and date distributions match the locked matrix', async () => {
  const { matrix, clock } = await historicalCommerceFixture();

  assert.deepEqual(
    matrix.distributions.customerCounts,
    HISTORICAL_CUSTOMER_ORDER_COUNTS,
  );
  assert.deepEqual(matrix.distributions.statusCounts, HISTORICAL_STATUS_COUNTS);
  assert.deepEqual(matrix.distributions.dateBuckets, {
    current_7_days: 12,
    days_8_to_30: 12,
    earlier_current_year: 18,
  });
  assert.ok(matrix.orders.every((order) => order.placedAt <= clock.anchorTime));
  assert.ok(matrix.orders.every((order) => order.updatedAt <= clock.anchorTime));
  assert.equal(
    matrix.orders.filter((order) => order.cancelledAt).length,
    4,
  );
  assert.ok(
    matrix.orders
      .filter((order) => order.cancelledAt)
      .every((order) => order.cancelledAt > order.placedAt),
  );
  assert.ok(
    matrix.orders.every((order) => {
      const payment = matrix.payments.find(
        (candidate) => candidate._id.toString() === order.paymentId.toString(),
      );
      return payment.createdAt < payment.verifiedAt && payment.verifiedAt < order.placedAt;
    }),
  );
});

test('commerce pool freezes two active Variant 01 Products per sport with in-stock positions', async () => {
  const { matrix } = await historicalCommerceFixture();
  const sportCounts = Object.fromEntries(
    [...new Set(matrix.pool.map((entry) => entry.product.sport))].map(
      (sport) => [
        sport,
        matrix.pool.filter((entry) => entry.product.sport === sport).length,
      ],
    ),
  );

  assert.deepEqual(
    matrix.pool.map((entry) => entry.seedKey),
    HISTORICAL_COMMERCE_PRODUCT_KEYS,
  );
  assert.equal(matrix.pool.length, 14);
  assert.equal(Object.keys(sportCounts).length, 7);
  assert.ok(Object.values(sportCounts).every((count) => count === 2));
  assert.ok(matrix.pool.every((entry) => entry.product.isActive));
  assert.ok(matrix.pool.every((entry) => entry.variant.isActive));
  assert.ok(matrix.pool.every((entry) => entry.inventory.stockState === 'in_stock'));
});

test('49 Order item IDs are preserved by Payments and four non-Order IDs remain Payment-only', async () => {
  const { matrix } = await historicalCommerceFixture();
  const paymentItemIds = matrix.payments.flatMap((payment) =>
    payment.checkoutSnapshot.items.map((item) => item._id.toString()),
  );
  const orderItemIds = matrix.orders.flatMap((order) =>
    order.items.map((item) => item._id.toString()),
  );

  assert.equal(paymentItemIds.length, 53);
  assert.equal(new Set(paymentItemIds).size, 53);
  assert.equal(orderItemIds.length, 49);
  assert.equal(new Set(orderItemIds).size, 49);
  assert.ok(orderItemIds.every((id) => paymentItemIds.includes(id)));
  assert.equal(paymentItemIds.filter((id) => !orderItemIds.includes(id)).length, 4);
  assert.deepEqual(
    Object.fromEntries(
      Object.keys(HISTORICAL_CUSTOMER_ORDER_COUNTS).map((customer) => [
        customer,
        matrix.orders
          .filter((order) => order.customerSeedKey === customer)
          .reduce((total, order) => total + order.items.length, 0),
      ]),
    ),
    {
      'user:checkout': 2,
      'user:orders': 12,
      'user:reviews': 9,
      'user:ratings': 9,
      'user:refunds': 13,
      'user:support': 4,
      'user:fresh': 0,
    },
  );
});

test('immutable snapshots preserve base price, discount, totals, shipping, and runtime Order numbers', async () => {
  const { matrix } = await historicalCommerceFixture();

  for (const payment of matrix.payments) {
    const snapshot = payment.checkoutSnapshot;
    assert.equal(
      snapshot.subtotal,
      snapshot.items.reduce((total, item) => total + item.lineTotal, 0),
    );
    assert.equal(snapshot.totalAmount, snapshot.subtotal - snapshot.discountAmount);
    assert.equal(payment.amount, snapshot.totalAmount);
    assert.ok(
      snapshot.items.every(
        (item) =>
          item.lineTotal ===
            (item.unitPrice - item.itemDiscount) * item.quantity,
      ),
    );
    assert.deepEqual(Object.keys(snapshot.shippingAddress).sort(), [
      'address',
      'city',
      'country',
      'fullName',
      'phone',
      'postalCode',
      'state',
    ]);
  }

  for (const order of matrix.orders) {
    const payment = matrix.payments.find(
      (candidate) => candidate._id.toString() === order.paymentId.toString(),
    );
    assert.equal(order.orderNumber, `MS-${order._id.toString().toUpperCase()}`);
    assert.deepEqual(
      JSON.parse(JSON.stringify(order.items)),
      JSON.parse(JSON.stringify(payment.checkoutSnapshot.items)),
    );
    assert.equal(order.totalAmount, payment.checkoutSnapshot.totalAmount);
  }
});

test('Coupon matrix sequentially explains only USEDUP250=4 and LIMITED5=3', async () => {
  const { matrix, coupons } = await historicalCommerceFixture();
  const couponCodes = matrix.orders
    .map((order) => order.coupon?.code)
    .filter(Boolean);
  const currentCounts = Object.fromEntries(
    coupons.coupons.map((coupon) => [coupon.code, coupon.usedCount]),
  );

  assert.equal(couponCodes.filter((code) => code === 'USEDUP250').length, 4);
  assert.equal(couponCodes.filter((code) => code === 'LIMITED5').length, 3);
  assert.equal(new Set(couponCodes).size, 2);
  assert.equal(matrix.couponCounters.get('coupon:USEDUP250'), 4);
  assert.equal(matrix.couponCounters.get('coupon:LIMITED5'), 3);
  assert.equal(currentCounts.USEDUP250, 4);
  assert.equal(currentCounts.LIMITED5, 3);
  assert.equal(currentCounts.DEMO10, 0);
});

test('review eligibility reserves two disjoint seven-Product delivered purchase sets', async () => {
  const { matrix } = await historicalCommerceFixture();
  const reviews = matrix.reviewEligibility.reviews;
  const ratings = matrix.reviewEligibility.ratings;

  assert.equal(reviews.length, 7);
  assert.equal(ratings.length, 7);
  assert.equal(new Set(reviews.map((item) => item.productId.toString())).size, 7);
  assert.equal(new Set(ratings.map((item) => item.productId.toString())).size, 7);
  assert.equal(
    new Set(
      [...reviews, ...ratings].map((item) => item.productId.toString()),
    ).size,
    14,
  );

  for (const eligible of [...reviews, ...ratings]) {
    const order = matrix.orders.find(
      (candidate) => candidate._id.toString() === eligible.orderId.toString(),
    );
    const payment = matrix.payments.find(
      (candidate) => candidate._id.toString() === eligible.paymentId.toString(),
    );
    assert.equal(order.orderStatus, 'delivered');
    assert.equal(payment.status, 'succeeded');
  }
});

test('refund eligibility reserves exact six customer, four cancellation, and two compensation scopes', async () => {
  const { matrix } = await historicalCommerceFixture();
  const plan = matrix.refundEligibility;

  assert.equal(plan.customerRequest.length, 6);
  assert.equal(plan.orderCancellation.length, 4);
  assert.equal(plan.systemCompensation.length, 2);
  assert.equal(
    new Set(
      plan.customerRequest.flatMap((scope) =>
        scope.itemIds.map((itemId) => itemId.toString()),
      ),
    ).size,
    6,
  );
  assert.ok(
    plan.orderCancellation.every((scope) =>
      matrix.orders.some(
        (order) =>
          order._id.toString() === scope.orderId.toString() &&
          order.orderStatus === 'cancelled',
      ),
    ),
  );
  assert.ok(
    plan.systemCompensation.every((scope) =>
      matrix.payments.some(
        (payment) =>
          payment._id.toString() === scope.paymentId.toString() &&
          payment.commerceResolution === 'system_compensation',
      ),
    ),
  );
});

test('Inventory plan projects 49 purchases, four restorations, safe stock, and intact live Carts', async () => {
  const { matrix } = await historicalCommerceFixture();
  const plan = matrix.inventoryEffectPlan;
  const purchases = plan.effects.filter(
    (effect) => effect.reason === 'order_purchase',
  );
  const cancellations = plan.effects.filter(
    (effect) => effect.reason === 'order_cancellation',
  );
  const affected = plan.projection.filter((position) => position.quantityChange !== 0);

  assert.equal(purchases.length, 49);
  assert.equal(cancellations.length, 4);
  assert.equal(plan.effects.length, 53);
  assert.equal(104 + plan.effects.length, 157);
  assert.equal(
    affected.reduce((total, position) => total + position.quantityChange, 0),
    -45,
  );
  assert.ok(plan.projection.every((position) => position.projectedQuantity >= 0));
  assert.ok(affected.every((position) => position.projectedQuantity > 5));
  assert.deepEqual(plan.liveCartSafety, {
    validLiveLines: 5,
    staleSupportLines: 1,
  });
});

test('historical analytics recognize 38 paid Orders across seven sports with repeated sales', async () => {
  const { matrix } = await historicalCommerceFixture();

  assert.equal(matrix.counts.recognizedOrders, 38);
  assert.equal(matrix.analytics.recognizedSports, 7);
  assert.ok(matrix.analytics.recognizedRevenue > 0);
  assert.ok(matrix.analytics.repeatedTopSellerCount > 1);
  assert.ok(matrix.analytics.zeroSaleCatalogProducts >= 28);
});

test('all 46 Payments and 42 Orders validate in memory and the module exposes no persistence API', async () => {
  const { matrix } = await historicalCommerceFixture();
  const abandoned = matrix.payments.filter((payment) => payment.kind === 'abandoned');
  const compensation = matrix.payments.filter(
    (payment) => payment.kind === 'system_compensation',
  );

  assert.equal(matrix.counts.modelValidatedPayments, 46);
  assert.equal(matrix.counts.modelValidatedOrders, 42);
  assert.ok(
    matrix.payments.every(
      (payment) =>
        payment.providerOrderId.startsWith('demo_rzp_order_') &&
        (!payment.providerPaymentId ||
          payment.providerPaymentId.startsWith('demo_rzp_payment_')),
    ),
  );
  assert.ok(
    abandoned.every(
      (payment) =>
        !Object.hasOwn(payment, 'providerPaymentId') &&
        !Object.hasOwn(payment, 'verifiedAt') &&
        !Object.hasOwn(payment, 'commerceResolution'),
    ),
  );
  assert.ok(
    compensation.every(
      (payment) =>
        payment.providerPaymentId &&
        payment.verifiedAt &&
        payment.commerceResolution === 'system_compensation',
    ),
  );
  assert.equal(
    Object.keys(commerceScenarioModule).some((name) =>
      /^(seed|persist|reset)/i.test(name),
    ),
    false,
  );
});

let historicalPersistenceFixturePromise;

async function historicalPersistenceFixture() {
  historicalPersistenceFixturePromise ??= (async () => {
    const fixture = await historicalCommerceFixture();
    const validated = await validateHistoricalPersistenceDefinitions({
      matrix: fixture.matrix,
      registry: fixture.registry,
      foundationalPositions: fixture.inventory.positions,
    });

    return { ...fixture, validated };
  })();

  return historicalPersistenceFixturePromise;
}

test('matrix correction reserves four cancellations and marks all Orders reconciled', async () => {
  const { matrix } = await historicalPersistenceFixture();

  assert.equal(matrix.refundEligibility.customerRequest.length, 6);
  assert.equal(matrix.refundEligibility.orderCancellation.length, 4);
  assert.equal(matrix.refundEligibility.systemCompensation.length, 2);
  assert.equal(
    matrix.orders.filter((order) => order.cartReconciledAt).length,
    42,
  );
  assert.ok(
    matrix.orders.every(
      (order) =>
        order.cartReconciledAt.getTime() - order.placedAt.getTime() ===
          10 * 60 * 1000 &&
        order.updatedAt >= order.cartReconciledAt,
    ),
  );
});

test('historical adjustment registry contains exact 49 purchase and four cancellation keys', async () => {
  const { registry } = await historicalPersistenceFixture();
  const keys = registry.keysByEntity.historicalInventoryAdjustments;
  const ids = keys.map((key) => registry.idFor(key).toString());

  assert.equal(keys.length, 53);
  assert.equal(keys.filter((key) => key.includes(':purchase:')).length, 49);
  assert.equal(keys.filter((key) => key.includes(':cancellation:')).length, 4);
  assert.equal(new Set(ids).size, 53);
  assert.equal(registry.entries.length, 717);
  assert.ok(
    keys.every((key) =>
      /^inventory-adjustment:historical:order:\d{2}:(purchase|cancellation):\d{2}$/.test(
        key,
      ),
    ),
  );
});

test('historical adjustments walk chronological Inventory arithmetic exactly', async () => {
  const { validated } = await historicalPersistenceFixture();
  const running = new Map(
    validated.foundationalPositions.map((position) => [
      position._id.toString(),
      position.quantity,
    ]),
  );
  let previousTimestamp = new Date(0);

  for (const adjustment of validated.historicalAdjustments) {
    const inventoryId = adjustment.inventoryId.toString();
    const previousQuantity = running.get(inventoryId);

    assert.ok(adjustment.createdAt >= previousTimestamp);
    assert.equal(adjustment.updatedAt.toISOString(), adjustment.createdAt.toISOString());
    assert.equal(adjustment.previousQuantity, previousQuantity);
    assert.equal(
      adjustment.newQuantity,
      adjustment.previousQuantity + adjustment.quantityChange,
    );
    assert.ok(adjustment.newQuantity >= 0);
    assert.equal(adjustment.sourceType, 'order');
    assert.equal(Object.hasOwn(adjustment, 'performedBy'), false);
    assert.equal(Object.hasOwn(adjustment, 'note'), false);
    running.set(inventoryId, adjustment.newQuantity);
    previousTimestamp = adjustment.createdAt;
  }

  assert.equal(
    validated.historicalAdjustments.reduce(
      (total, adjustment) => total + adjustment.quantityChange,
      0,
    ),
    -45,
  );
});

test('historical overlay locks 14 affected positions, final quantities, and last-effect timestamps', async () => {
  const { validated } = await historicalPersistenceFixture();

  assert.equal(validated.finalPositions.length, 105);
  assert.equal(validated.affectedPositions.length, 14);
  assert.equal(validated.netChange, -45);
  assert.equal(
    Math.min(...validated.affectedPositions.map((position) => position.quantity)),
    13,
  );
  assert.ok(validated.finalPositions.every((position) => position.quantity >= 0));

  for (const position of validated.affectedPositions) {
    const lastEffect = position.historicalAdjustments.at(-1);
    assert.equal(position.updatedAt.toISOString(), lastEffect.createdAt.toISOString());
    assert.equal(position.createdAt.toISOString(),
      validated.foundationalPositions
        .find((candidate) => candidate._id.toString() === position._id.toString())
        .createdAt.toISOString());
  }
});

function exactHistoricalSnapshot(validated) {
  return {
    validated,
    payments: validated.matrix.payments,
    orders: validated.matrix.orders,
    historicalAdjustments: validated.historicalAdjustments,
    foundationalAdjustments: validated.foundationalAdjustments,
    inventory: validated.finalPositions,
  };
}

function baseHistoricalSnapshot(validated) {
  return {
    validated,
    payments: [],
    orders: [],
    historicalAdjustments: [],
    foundationalAdjustments: validated.foundationalAdjustments,
    inventory: validated.foundationalPositions,
  };
}

test('whole-layer preflight classification accepts only clean BASE and exact FINAL states', async () => {
  const { validated } = await historicalPersistenceFixture();

  assert.equal(
    classifyHistoricalCommerceSnapshot(baseHistoricalSnapshot(validated)),
    HISTORICAL_COMMERCE_STATES.BASE,
  );
  assert.equal(
    classifyHistoricalCommerceSnapshot(exactHistoricalSnapshot(validated)),
    HISTORICAL_COMMERCE_STATES.EXACT_FINAL,
  );
});

test('whole-layer preflight rejects partial Payment, Order, adjustment, and Inventory states', async () => {
  const { validated } = await historicalPersistenceFixture();
  const partials = [
    {
      ...baseHistoricalSnapshot(validated),
      payments: [validated.matrix.payments[0]],
    },
    {
      ...baseHistoricalSnapshot(validated),
      orders: [validated.matrix.orders[0]],
    },
    {
      ...baseHistoricalSnapshot(validated),
      historicalAdjustments: [validated.historicalAdjustments[0]],
    },
    {
      ...baseHistoricalSnapshot(validated),
      inventory: validated.foundationalPositions.map((position) =>
        position._id.toString() === validated.affectedPositions[0]._id.toString()
          ? validated.affectedPositions[0]
          : position,
      ),
    },
  ];

  for (const snapshot of partials) {
    assert.equal(
      classifyHistoricalCommerceSnapshot(snapshot),
      HISTORICAL_COMMERCE_STATES.PARTIAL,
    );
  }
});

test('whole-layer preflight detects provider, Order-number, and field drift', async () => {
  const { validated } = await historicalPersistenceFixture();
  const payment = validated.matrix.payments[0];
  const order = validated.matrix.orders[0];
  const providerConflict = {
    ...baseHistoricalSnapshot(validated),
    payments: [
      {
        ...payment,
        _id: deterministicObjectId('conflict:historical:payment'),
      },
    ],
  };
  const orderConflict = {
    ...baseHistoricalSnapshot(validated),
    orders: [
      {
        ...order,
        _id: deterministicObjectId('conflict:historical:order'),
      },
    ],
  };
  const drift = {
    ...exactHistoricalSnapshot(validated),
    payments: [
      { ...payment, amount: payment.amount + 1 },
      ...validated.matrix.payments.slice(1),
    ],
  };

  assert.equal(
    classifyHistoricalCommerceSnapshot(providerConflict),
    HISTORICAL_COMMERCE_STATES.CONFLICT,
  );
  assert.equal(
    classifyHistoricalCommerceSnapshot(orderConflict),
    HISTORICAL_COMMERCE_STATES.CONFLICT,
  );
  assert.equal(
    classifyHistoricalCommerceSnapshot(drift),
    HISTORICAL_COMMERCE_STATES.DRIFT,
  );
});

test('exact historical final overlay is accepted without foundational quantity fallback', async () => {
  const { validated } = await historicalPersistenceFixture();
  const state = classifyHistoricalCommerceSnapshot(
    exactHistoricalSnapshot(validated),
  );

  assert.equal(state, HISTORICAL_COMMERCE_STATES.EXACT_FINAL);
  assert.ok(
    validated.affectedPositions.every((finalPosition) => {
      const foundational = validated.foundationalPositions.find(
        (position) => position._id.toString() === finalPosition._id.toString(),
      );
      return finalPosition.quantity !== foundational.quantity;
    }),
  );
});

test('persisted definition contracts lock Payment, Order, and adjustment distributions', async () => {
  const { validated } = await historicalPersistenceFixture();
  const payments = validated.matrix.payments;
  const orders = validated.matrix.orders;
  const adjustments = validated.historicalAdjustments;

  assert.equal(payments.length, 46);
  assert.equal(payments.filter((payment) => payment.status === 'succeeded').length, 44);
  assert.equal(payments.filter((payment) => payment.status === 'created').length, 2);
  assert.equal(
    payments.filter((payment) => payment.commerceResolution === 'order').length,
    42,
  );
  assert.equal(
    payments.filter(
      (payment) => payment.commerceResolution === 'system_compensation',
    ).length,
    2,
  );
  assert.equal(
    payments.filter((payment) => !payment.commerceResolution).length,
    2,
  );
  assert.equal(orders.length, 42);
  assert.equal(orders.flatMap((order) => order.items).length, 49);
  assert.equal(orders.filter((order) => order.cancelledAt).length, 4);
  assert.equal(orders.filter((order) => order.cartReconciledAt).length, 42);
  assert.equal(
    adjustments.filter((adjustment) => adjustment.reason === 'order_purchase').length,
    49,
  );
  assert.equal(
    adjustments.filter(
      (adjustment) => adjustment.reason === 'order_cancellation',
    ).length,
    4,
  );
});

test('historical reset scope is exact and downstream Refund dependencies refuse reset', async () => {
  const { validated } = await historicalPersistenceFixture();
  const paymentFilter = exactHistoricalIdFilter(validated.matrix.payments);
  const orderFilter = exactHistoricalIdFilter(validated.matrix.orders);
  const adjustmentFilter = exactHistoricalIdFilter(
    validated.historicalAdjustments,
  );

  assert.equal(paymentFilter._id.$in.length, 46);
  assert.equal(orderFilter._id.$in.length, 42);
  assert.equal(adjustmentFilter._id.$in.length, 53);
  assert.doesNotThrow(() => assertNoHistoricalResetDependencies([]));
  assert.throws(
    () => assertNoHistoricalResetDependencies(['Refund']),
    (error) => error.code === 'DEMO_HISTORICAL_RESET_DEPENDENCY',
  );
  assert.equal(JSON.stringify(paymentFilter).includes('status'), false);
  assert.equal(JSON.stringify(orderFilter).includes('orderStatus'), false);
});

let reviewFixturePromise;

async function reviewFixture() {
  reviewFixturePromise ??= (async () => {
    const fixture = await historicalPersistenceFixture();
    const validatedReviews = await validateReviewDefinitions({
      registry: fixture.registry,
      clock: fixture.clock,
      matrix: fixture.matrix,
      productDefinitions: fixture.products.definitions,
      users: fixture.users,
    });

    return { ...fixture, validatedReviews };
  })();

  return reviewFixturePromise;
}

test('Review registry replaces eight placeholders with fourteen semantic identities', async () => {
  const { registry } = await reviewFixture();
  const keys = registry.keysByEntity.reviews;
  const ids = keys.map((key) => registry.idFor(key).toString());

  assert.equal(keys.length, 14);
  assert.equal(registry.entries.length, 717);
  assert.equal(new Set(ids).size, 14);
  assert.equal(keys.some((key) => key.startsWith('review:scenario:')), false);
  assert.deepEqual(keys.slice(0, 2), [
    'review:user:reviews:01',
    'review:user:reviews:02',
  ]);
  assert.equal(keys.at(-1), 'review:user:ratings:07');
  assert.equal(LEGACY_REVIEW_KEYS.length, 8);
  assert.equal(
    findLegacyReviewPlaceholders(
      LEGACY_REVIEW_KEYS.map((key) => ({ _id: deterministicObjectId(key) })),
    ).length,
    8,
  );
});

test('Review definitions lock exact Product order, texts, and Customer ownership', async () => {
  const { validatedReviews } = await reviewFixture();
  const reviews = validatedReviews.reviews;

  assert.equal(reviews.length, 14);
  assert.deepEqual(
    reviews.map((review) => review.productName),
    [
      'Stride Control Football Boots',
      'TouchLine Shin Guards',
      'WillowCraft English Cricket Bat',
      'GuardFlex Batting Pads',
      'Elevate Court Basketball Shoes',
      'DriveGuard Knee Sleeve Pair',
      'RallyPoint Control Tennis Racquet',
      'SpinPath Overgrip Pack',
      'AeroStrike Control Badminton Racquet',
      'SwiftCourt Indoor Badminton Shoes',
      'TempoRun Daily Trainers',
      'Endurance Breathable Running Tee',
      'CoreLift Cast Kettlebell',
      'BalanceFlow Yoga Mat',
    ],
  );
  assert.deepEqual(
    reviews.map((review) => review.text),
    REVIEW_DEFINITIONS.map((definition) => definition.text),
  );
  assert.equal(
    reviews.filter((review) => review.customerSeedKey === 'user:reviews').length,
    7,
  );
  assert.equal(
    reviews.filter((review) => review.customerSeedKey === 'user:ratings').length,
    7,
  );
  assert.equal(
    new Set(
      reviews.map(
        (review) => `${review.customerId.toString()}:${review.productId.toString()}`,
      ),
    ).size,
    14,
  );
});

test('Review rating and moderation distributions match visible and complete locks', async () => {
  const { validatedReviews } = await reviewFixture();
  const reviews = validatedReviews.reviews;
  const visible = reviews.filter(
    (review) => review.moderationStatus === 'visible',
  );
  const hidden = reviews.filter(
    (review) => review.moderationStatus === 'hidden',
  );
  const countsFor = (values) =>
    Object.fromEntries(
      [1, 2, 3, 4, 5].map((rating) => [
        rating,
        values.filter((review) => review.rating === rating).length,
      ]),
    );

  assert.deepEqual(countsFor(reviews), { 1: 1, 2: 1, 3: 4, 4: 4, 5: 4 });
  assert.deepEqual(countsFor(visible), { 1: 1, 2: 0, 3: 2, 4: 3, 5: 4 });
  assert.equal(visible.length, 10);
  assert.equal(hidden.length, 4);
  assert.equal(visible.reduce((total, review) => total + review.rating, 0), 39);
  assert.equal(validatedReviews.counts.visibleAverage, 3.9);
  assert.deepEqual(
    hidden.map((review) => review.seedKey),
    [
      'review:user:reviews:02',
      'review:user:reviews:04',
      'review:user:ratings:03',
      'review:user:ratings:05',
    ],
  );
});

test('Review eligibility, timestamps, moderation audit, and sport coverage are exact', async () => {
  const { matrix, validatedReviews } = await reviewFixture();
  const ordersById = new Map(
    matrix.orders.map((order) => [order._id.toString(), order]),
  );
  const paymentsById = new Map(
    matrix.payments.map((payment) => [payment._id.toString(), payment]),
  );
  const visibleSports = new Set();

  for (const review of validatedReviews.reviews) {
    const order = ordersById.get(review.orderId.toString());
    const payment = paymentsById.get(review.paymentId.toString());
    const item = order.items.find(
      (candidate) => candidate._id.toString() === review.itemId.toString(),
    );

    assert.equal(order.orderStatus, 'delivered');
    assert.equal(order.customerId.toString(), review.customerId.toString());
    assert.equal(item.productId.toString(), review.productId.toString());
    assert.equal(payment.status, 'succeeded');
    assert.equal(payment.commerceResolution, 'order');
    assert.equal(payment.customerId.toString(), review.customerId.toString());
    assert.ok(review.createdAt > order.updatedAt);
    assert.ok(review.createdAt <= review.anchorTime);

    if (review.moderationStatus === 'hidden') {
      assert.ok(review.moderationReason);
      assert.equal(
        review.moderatedBy.toString(),
        validatedReviews.authorities.admin._id.toString(),
      );
      assert.ok(review.moderatedAt > review.createdAt);
      assert.equal(review.updatedAt.toISOString(), review.moderatedAt.toISOString());
    } else {
      visibleSports.add(review.sport);
      assert.equal(review.moderationReason, null);
      assert.equal(review.moderatedBy, null);
      assert.equal(review.moderatedAt, null);
      assert.equal(review.updatedAt.toISOString(), review.createdAt.toISOString());
    }
  }

  assert.deepEqual([...visibleSports].sort(), [
    'badminton',
    'basketball',
    'cricket',
    'fitness',
    'football',
    'running',
    'tennis',
  ]);
});

test('Review classification covers missing, exact, ID conflict, and natural conflict', async () => {
  const { validatedReviews } = await reviewFixture();
  const expected = validatedReviews.reviews[0];

  assert.equal(
    classifyReviewRecord({ expected }).classification,
    REVIEW_CLASSIFICATIONS.MISSING,
  );
  assert.equal(
    classifyReviewRecord({
      expected,
      recordById: expected,
      recordByNatural: expected,
    }).classification,
    REVIEW_CLASSIFICATIONS.EXACT,
  );
  assert.equal(
    classifyReviewRecord({
      expected,
      recordById: {
        ...expected,
        productId: deterministicObjectId('review:conflict:product'),
      },
    }).classification,
    REVIEW_CLASSIFICATIONS.ID_CONFLICT,
  );
  assert.equal(
    classifyReviewRecord({
      expected,
      recordByNatural: {
        ...expected,
        _id: deterministicObjectId('review:conflict:id'),
      },
    }).classification,
    REVIEW_CLASSIFICATIONS.NATURAL_KEY_CONFLICT,
  );
});

test('Review classification rejects rating, text, moderation, audit, and timestamp drift', async () => {
  const { validatedReviews } = await reviewFixture();
  const visible = validatedReviews.reviews.find(
    (review) => review.moderationStatus === 'visible',
  );
  const hidden = validatedReviews.reviews.find(
    (review) => review.moderationStatus === 'hidden',
  );
  const driftedRecords = [
    { ...visible, rating: visible.rating - 1 },
    { ...visible, text: `${visible.text} changed` },
    { ...visible, moderationStatus: 'hidden' },
    { ...hidden, moderationReason: 'Changed reason.' },
    { ...hidden, moderatedBy: deterministicObjectId('review:other:admin') },
    { ...hidden, moderatedAt: new Date(hidden.moderatedAt.getTime() + 1) },
    { ...visible, createdAt: new Date(visible.createdAt.getTime() + 1) },
    { ...visible, updatedAt: new Date(visible.updatedAt.getTime() + 1) },
  ];

  for (const record of driftedRecords) {
    const expected =
      record._id.toString() === hidden._id.toString() ? hidden : visible;

    assert.equal(
      classifyReviewRecord({
        expected,
        recordById: record,
        recordByNatural: record,
      }).classification,
      REVIEW_CLASSIFICATIONS.DRIFT,
    );
  }
});

test('Review preflight rejects legacy ownership and accepts only missing or exact records', async () => {
  const { validatedReviews } = await reviewFixture();
  const expected = validatedReviews.reviews;

  assert.ok(
    (await preflightReviews(expected, [])).every(
      (result) => result.classification === REVIEW_CLASSIFICATIONS.MISSING,
    ),
  );
  assert.ok(
    (await preflightReviews(expected, expected)).every(
      (result) => result.classification === REVIEW_CLASSIFICATIONS.EXACT,
    ),
  );
  await assert.rejects(
    preflightReviews(expected, [
      { _id: deterministicObjectId(LEGACY_REVIEW_KEYS[0]) },
    ]),
    (error) => error.code === 'DEMO_SEED_DRIFT',
  );
});

test('public, Customer, Admin, and rating-summary projections exclude hidden Reviews correctly', async () => {
  const { validatedReviews } = await reviewFixture();
  const reviews = validatedReviews.reviews;
  const visible = reviews.filter(
    (review) => review.moderationStatus === 'visible',
  );
  const hidden = reviews.filter(
    (review) => review.moderationStatus === 'hidden',
  );

  assert.equal(reviews.length, 14);
  assert.equal(visible.length, 10);
  assert.equal(hidden.length, 4);
  assert.equal(
    reviews.filter((review) => review.customerSeedKey === 'user:reviews').length,
    7,
  );
  assert.equal(
    reviews.filter((review) => review.customerSeedKey === 'user:ratings').length,
    7,
  );
  assert.deepEqual(
    [1, 2, 3, 4, 5].map(
      (rating) => reviews.filter((review) => review.rating === rating).length,
    ),
    [1, 1, 4, 4, 4],
  );
  assert.deepEqual(
    hidden.map((review) => review.productName),
    [
      'TouchLine Shin Guards',
      'GuardFlex Batting Pads',
      'SwiftCourt Indoor Badminton Shoes',
      'Endurance Breathable Running Tee',
    ],
  );
  assert.ok(
    hidden.every(
      (review) =>
        visible.filter(
          (candidate) =>
            candidate.productId.toString() === review.productId.toString(),
        ).length === 0,
    ),
  );
});

test('Review reset filter requires all exact ID, Customer, and Product identities', async () => {
  const { validatedReviews } = await reviewFixture();
  const filter = exactReviewOwnershipFilter(validatedReviews.reviews);

  assert.equal(filter.$or.length, 14);
  assert.ok(
    filter.$or.every(
      (entry) =>
        entry._id && entry.customerId && entry.productId &&
        Object.keys(entry).length === 3,
    ),
  );
  assert.equal(JSON.stringify(filter).includes('moderationStatus'), false);
  assert.throws(
    () => exactReviewOwnershipFilter(validatedReviews.reviews.slice(1)),
    (error) => error.code === 'DEMO_REVIEW_RESET_SCOPE_INVALID',
  );
});

test('Review reset executes before historical commerce and contains no broad delete', () => {
  const resetSource = readFileSync(
    new URL('./resetDemoData.js', import.meta.url),
    'utf8',
  );
  const reviewSource = readFileSync(
    new URL('./reviews.seed.js', import.meta.url),
    'utf8',
  );
  const reviewResetIndex = resetSource.indexOf('await resetReviews');
  const historicalResetIndex = resetSource.indexOf(
    'await resetHistoricalCommerce',
  );

  assert.ok(reviewResetIndex >= 0);
  assert.ok(historicalResetIndex > reviewResetIndex);
  assert.equal(reviewSource.includes('Review.deleteMany({})'), false);
  assert.equal(reviewSource.includes('deleteMany({ customerId'), false);
  assert.equal(reviewSource.includes('deleteMany({ productId'), false);
});

let refundFixturePromise;

async function refundFixture() {
  refundFixturePromise ??= (async () => {
    const fixture = await reviewFixture();
    const validatedRefunds = await validateRefundDefinitions({
      registry: fixture.registry,
      clock: fixture.clock,
      matrix: fixture.matrix,
      users: fixture.users,
    });
    return { ...fixture, validatedRefunds };
  })();
  return refundFixturePromise;
}

test('Refund registry replaces four placeholders with twelve semantic identities', async () => {
  const { registry } = await refundFixture();
  const keys = registry.keysByEntity.refunds;

  assert.equal(registry.entries.length, 717);
  assert.equal(keys.length, 12);
  assert.equal(new Set(keys.map((key) => registry.idFor(key).toString())).size, 12);
  assert.deepEqual(keys.slice(0, 2), [
    'refund:customer-request:01',
    'refund:customer-request:02',
  ]);
  assert.equal(keys.at(-1), 'refund:system-compensation:02');
  assert.equal(keys.some((key) => key.startsWith('refund:scenario:')), false);
  assert.equal(
    findLegacyRefundPlaceholders(
      LEGACY_REFUND_KEYS.map((key) => ({ _id: deterministicObjectId(key) })),
    ).length,
    4,
  );
});

test('Refund definitions lock origin, status, provider, audit, and scope totals', async () => {
  const { validatedRefunds } = await refundFixture();
  const refunds = validatedRefunds.refunds;
  const counts = (field, value) =>
    refunds.filter((refund) => refund[field] === value).length;

  assert.equal(refunds.length, 12);
  assert.deepEqual(validatedRefunds.counts.origins, {
    customer_request: 6,
    order_cancellation: 4,
    system_compensation: 2,
  });
  assert.deepEqual(validatedRefunds.counts.statuses, {
    requested: 1,
    approved: 2,
    rejected: 1,
    processing: 2,
    refunded: 3,
    failed: 3,
  });
  assert.equal(refunds.filter((refund) => refund.providerRefundId).length, 8);
  assert.equal(new Set(refunds.map((refund) => refund.providerRefundId).filter(Boolean)).size, 8);
  assert.equal(refunds.filter((refund) => refund.refundedAt).length, 3);
  assert.equal(counts('scope', 'items'), 6);
  assert.equal(counts('scope', 'order'), 4);
  assert.equal(refunds.filter((refund) => !refund.scope).length, 2);
});

test('Refund eligibility locks exact Orders, Payments, Customers, and item scopes', async () => {
  const { matrix, validatedRefunds } = await refundFixture();
  const { customerRequests, orderCancellations, systemCompensations } =
    validatedRefunds.groups;
  const ordersById = new Map(
    matrix.orders.map((order) => [order._id.toString(), order]),
  );
  const paymentsById = new Map(
    matrix.payments.map((payment) => [payment._id.toString(), payment]),
  );

  assert.deepEqual(
    customerRequests.map((refund) => ordersById.get(refund.orderId.toString()).seedKey),
    [
      'order:historical:31',
      'order:historical:31',
      'order:historical:32',
      'order:historical:32',
      'order:historical:33',
      'order:historical:33',
    ],
  );
  assert.deepEqual(
    orderCancellations.map((refund) => ordersById.get(refund.orderId.toString()).seedKey),
    [
      'order:historical:14',
      'order:historical:36',
      'order:historical:37',
      'order:historical:38',
    ],
  );
  assert.deepEqual(
    systemCompensations.map(
      (refund) => paymentsById.get(refund.paymentId.toString()).seedKey,
    ),
    [
      'payment:system-compensation:01',
      'payment:system-compensation:02',
    ],
  );
  assert.ok(customerRequests.every((refund) => refund.itemIds.length === 1));
  assert.ok(orderCancellations.every((refund) => refund.itemIds.length === 0));
  assert.ok(systemCompensations.every((refund) => !refund.orderId));
});

test('Customer Refund reasons, decisions, timestamps, and restock plan are exact', async () => {
  const { validatedRefunds } = await refundFixture();
  const refunds = validatedRefunds.groups.customerRequests;

  assert.deepEqual(refunds.map((refund) => refund.status), [
    'requested',
    'approved',
    'rejected',
    'processing',
    'refunded',
    'failed',
  ]);
  assert.deepEqual(refunds.map((refund) => refund.restockOnCompletion), [
    undefined,
    true,
    undefined,
    false,
    false,
    true,
  ]);
  assert.equal(refunds.filter((refund) => refund.reviewedBy).length, 5);
  assert.equal(
    refunds[2].adminDecisionNote,
    'Request does not meet the accepted return conditions.',
  );
  assert.equal(refunds[4].restockOnCompletion, false);
  assert.equal(validatedRefunds.counts.refundReturnAdjustments, 0);
  assert.ok(refunds.every((refund) => refund.createdAt === refund.requestedAt));
});

test('Refund domain amounts and scope claims have no active collisions', async () => {
  const { validatedRefunds } = await refundFixture();
  const refunds = validatedRefunds.refunds;
  let collisions = 0;

  for (let left = 0; left < refunds.length; left += 1) {
    for (let right = left + 1; right < refunds.length; right += 1) {
      collisions += refundScopesConflict(refunds[left], refunds[right]) ? 1 : 0;
    }
  }
  assert.equal(collisions, 0);
  assert.ok(refunds.every((refund) => Number.isSafeInteger(refund.amount) && refund.amount > 0));
  assert.ok(
    refunds
      .filter((refund) => refund.orderId)
      .every((refund) => refund.scopeClaimKeys.length > 0),
  );
  assert.ok(
    validatedRefunds.groups.systemCompensations.every(
      (refund) => refund.scopeOccupied === false && refund.scopeClaimKeys === undefined,
    ),
  );
});

test('Refund classification covers missing, exact, identity, provider, and scope conflicts', async () => {
  const { validatedRefunds } = await refundFixture();
  const expected = validatedRefunds.groups.customerRequests[0];
  const providerExpected = validatedRefunds.groups.customerRequests[3];

  assert.equal(
    classifyRefundRecord({ expected }).classification,
    REFUND_CLASSIFICATIONS.MISSING,
  );
  assert.equal(
    classifyRefundRecord({ expected, recordById: expected, recordByNatural: expected }).classification,
    REFUND_CLASSIFICATIONS.EXACT,
  );
  assert.equal(
    classifyRefundRecord({
      expected,
      recordById: { ...expected, orderId: deterministicObjectId('refund:other:order') },
    }).classification,
    REFUND_CLASSIFICATIONS.ID_CONFLICT,
  );
  assert.equal(
    classifyRefundRecord({
      expected,
      recordByNatural: { ...expected, _id: deterministicObjectId('refund:other:id') },
    }).classification,
    REFUND_CLASSIFICATIONS.NATURAL_KEY_CONFLICT,
  );
  assert.equal(
    classifyRefundRecord({
      expected: providerExpected,
      recordByProviderRefundId: {
        ...providerExpected,
        _id: deterministicObjectId('refund:other:provider-id'),
      },
    }).classification,
    REFUND_CLASSIFICATIONS.PROVIDER_REFUND_ID_CONFLICT,
  );
  assert.equal(
    classifyRefundRecord({ expected, scopeConflict: true }).classification,
    REFUND_CLASSIFICATIONS.SCOPE_CONFLICT,
  );
});

test('Refund classification rejects status, amount, audit, and timestamp drift', async () => {
  const { validatedRefunds } = await refundFixture();
  const expected = validatedRefunds.groups.customerRequests[4];
  const drifts = [
    { ...expected, status: 'failed' },
    { ...expected, amount: expected.amount + 1 },
    { ...expected, reviewedBy: deterministicObjectId('refund:other:admin') },
    { ...expected, refundedAt: new Date(expected.refundedAt.getTime() + 1) },
    { ...expected, updatedAt: new Date(expected.updatedAt.getTime() + 1) },
  ];

  for (const record of drifts) {
    assert.equal(
      classifyRefundRecord({ expected, recordById: record, recordByNatural: record })
        .classification,
      REFUND_CLASSIFICATIONS.DRIFT,
    );
  }
});

test('Refund preflight permits only whole missing or whole exact layers', async () => {
  const { validatedRefunds } = await refundFixture();
  const expected = validatedRefunds.refunds;

  assert.ok(
    (await preflightRefunds(expected, [])).every(
      (result) => result.classification === REFUND_CLASSIFICATIONS.MISSING,
    ),
  );
  assert.ok(
    (await preflightRefunds(expected, expected)).every(
      (result) => result.classification === REFUND_CLASSIFICATIONS.EXACT,
    ),
  );
  await assert.rejects(
    preflightRefunds(expected, expected.slice(0, 1)),
    (error) => error.code === 'DEMO_SEED_DRIFT',
  );
  await assert.rejects(
    preflightRefunds(expected, [
      { _id: deterministicObjectId(LEGACY_REFUND_KEYS[0]) },
    ]),
    (error) => error.code === 'DEMO_SEED_DRIFT',
  );
});

test('Refund ownership/service/analytics projections match the locked scenario matrix', async () => {
  const { users, validatedRefunds } = await refundFixture();
  const refunds = validatedRefunds.refunds;
  const userByKey = new Map(users.map((user) => [user.seedKey, user]));
  const refundsCustomerId = userByKey.get('user:refunds')._id.toString();
  const ordersCustomerId = userByKey.get('user:orders')._id.toString();
  const recentCustomer = validatedRefunds.groups.customerRequests;
  const providerRefunded = refunds.filter((refund) => refund.status === 'refunded');

  assert.equal(refunds.filter((refund) => refund.customerId.toString() === refundsCustomerId).length, 11);
  assert.equal(refunds.filter((refund) => refund.customerId.toString() === ordersCustomerId).length, 1);
  assert.deepEqual(
    ['requested', 'approved', 'rejected', 'processing', 'refunded', 'failed'].map(
      (status) => recentCustomer.filter((refund) => refund.status === status).length,
    ),
    [1, 1, 1, 1, 1, 1],
  );
  assert.deepEqual(
    ['customer_request', 'order_cancellation', 'system_compensation'].map(
      (origin) => providerRefunded.filter((refund) => refund.origin === origin).length,
    ),
    [1, 1, 1],
  );
  assert.equal(
    providerRefunded.reduce((sum, refund) => sum + refund.amount, 0),
    validatedRefunds.groups.customerRequests[4].amount +
      validatedRefunds.groups.orderCancellations[0].amount +
      validatedRefunds.groups.systemCompensations[0].amount,
  );
});

test('Refund reset is exact, follows Reviews, precedes history, and is never broad', async () => {
  const { validatedRefunds } = await refundFixture();
  const filter = exactRefundOwnershipFilter(validatedRefunds.refunds);
  const resetSource = readFileSync(new URL('./resetDemoData.js', import.meta.url), 'utf8');
  const refundSource = readFileSync(new URL('./refunds.seed.js', import.meta.url), 'utf8');

  assert.equal(filter.$or.length, 12);
  assert.ok(filter.$or.every((entry) => entry._id && entry.customerId && entry.paymentId && entry.origin));
  assert.ok(resetSource.indexOf('await resetRefunds') > resetSource.indexOf('await resetReviews'));
  assert.ok(resetSource.indexOf('await resetHistoricalCommerce') > resetSource.indexOf('await resetRefunds'));
  assert.equal(refundSource.includes('Refund.deleteMany({})'), false);
  assert.equal(refundSource.includes('deleteMany({ customerId'), false);
  assert.equal(refundSource.includes('deleteMany({ origin'), false);
  assert.throws(
    () => exactRefundOwnershipFilter(validatedRefunds.refunds.slice(1)),
    (error) => error.code === 'DEMO_REFUND_RESET_SCOPE_INVALID',
  );
});
