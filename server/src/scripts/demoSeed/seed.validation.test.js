import assert from 'node:assert/strict';
import test from 'node:test';

import * as argon2 from 'argon2';

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
  DEMO_USER_CLASSIFICATIONS,
  DEMO_USER_DEFINITIONS,
  buildExpectedDemoUsers,
  classifyDemoUserRecord,
  exactDemoUserPairFilter,
  validateDemoSeedPassword,
  validateDemoUserDefinitions,
} from './users.seed.js';

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
  assert.equal(registry.entries.length, 523);
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
