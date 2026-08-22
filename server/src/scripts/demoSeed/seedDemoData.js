import { AuthChallenge } from '../../modules/auth/authChallenge.model.js';
import { Category } from '../../modules/catalog/category.model.js';
import { Product } from '../../modules/catalog/product.model.js';
import { Inventory } from '../../modules/inventory/inventory.model.js';
import { InventoryAdjustment } from '../../modules/inventory/inventoryAdjustment.model.js';
import { User } from '../../modules/users/user.model.js';
import {
  seedCategories,
  validateCategoryDefinitions,
} from './categories.seed.js';
import {
  buildExpectedPersistedProducts,
  seedProducts,
} from './product.persistence.seed.js';
import { validateProductDefinitions } from './products.seed.js';
import {
  assertPersistedInventoryStructure,
  resolveSeedLowStockThreshold,
  seedInventoryCatalog,
  validateInventoryDefinitions,
} from './inventory.seed.js';
import {
  assertDemoCloudinaryUploadAllowed,
  requireDemoSeedPassword,
} from './seed.config.js';
import {
  seedDemoUsers,
  validateDemoSeedPassword,
  validateDemoUserDefinitions,
} from './users.seed.js';
import {
  SeedValidationError,
  connectSeedDatabase,
  disconnectSeedDatabase,
  printSeedError,
  snapshotCollectionCounts,
} from './seed.utils.js';
import { createSeedFoundationContext } from './seed.validation.js';

function assertCollectionDeltas(before, after, expectedDeltas) {
  const collectionNames = new Set([
    ...Object.keys(before),
    ...Object.keys(after),
    ...Object.keys(expectedDeltas),
  ]);

  for (const name of collectionNames) {
    const delta = (after[name] || 0) - (before[name] || 0);
    const expected = expectedDeltas[name] || 0;

    if (delta !== expected) {
      throw new SeedValidationError(
        'DEMO_SEED_COLLECTION_DELTA_INVALID',
        `Collection ${name} changed by ${delta}; expected ${expected}.`,
      );
    }
  }
}

function usersCollection() {
  return User.collection;
}

async function snapshotUnrelatedUsers(expectedUsers) {
  const documents = await usersCollection()
    .find({
      $and: [
        { _id: { $nin: expectedUsers.map((user) => user._id) } },
        { email: { $nin: expectedUsers.map((user) => user.email) } },
      ],
    })
    .sort({ _id: 1 })
    .toArray();

  return JSON.stringify(documents);
}

async function snapshotUnrelatedCategories(expectedCategories) {
  const documents = await Category.collection
    .find({
      $and: [
        { _id: { $nin: expectedCategories.map((category) => category._id) } },
        {
          $nor: expectedCategories.map((category) => ({
            sport: category.sport,
            nameKey: category.nameKey,
          })),
        },
      ],
    })
    .sort({ _id: 1 })
    .toArray();

  return JSON.stringify(documents);
}

async function snapshotUnrelatedProducts(expectedProducts) {
  const documents = await Product.collection
    .find({
      _id: { $nin: expectedProducts.map((product) => product._id) },
    })
    .sort({ _id: 1 })
    .toArray();

  return JSON.stringify(documents);
}

async function snapshotUnrelatedInventory(expectedPositions) {
  const documents = await Inventory.collection
    .find({
      _id: { $nin: expectedPositions.map((position) => position._id) },
    })
    .sort({ _id: 1 })
    .toArray();

  return JSON.stringify(documents);
}

async function snapshotUnrelatedInventoryAdjustments(expectedAdjustments) {
  const documents = await InventoryAdjustment.collection
    .find({
      _id: {
        $nin: expectedAdjustments.map((adjustment) => adjustment._id),
      },
    })
    .sort({ _id: 1 })
    .toArray();

  return JSON.stringify(documents);
}

async function countSeededAuthChallenges(expectedUsers) {
  return AuthChallenge.countDocuments({
    $or: [
      { userId: { $in: expectedUsers.map((user) => user._id) } },
      { targetEmail: { $in: expectedUsers.map((user) => user.email) } },
    ],
  });
}

async function verifyPasswordAuthentication({
  authenticatePassword,
  password,
}) {
  const admin = await authenticatePassword({
    email: 'admin.demo@example.test',
    password,
  });
  const customer = await authenticatePassword({
    email: 'checkout.demo@example.test',
    password,
  });

  if (admin.role !== 'admin' || customer.role !== 'customer') {
    throw new SeedValidationError(
      'DEMO_USER_LOGIN_VERIFICATION_FAILED',
      'Demo password authentication returned unexpected roles.',
    );
  }
}

export async function runDemoSeed() {
  const { config, manifest, registry, clock } =
    await createSeedFoundationContext();
  const password = validateDemoSeedPassword(requireDemoSeedPassword(config));
  const lowStockThreshold = resolveSeedLowStockThreshold();

  const { authenticatePassword } = await import(
    '../../modules/auth/auth.service.js'
  );
  const {
    PRODUCT_IMAGE_FOLDER,
    deleteProductImageAsset,
    uploadProductImageAsset,
  } = await import('../../integrations/cloudinary.js');
  let connection;

  try {
    connection = await connectSeedDatabase(config);
    const expectedUsers = await validateDemoUserDefinitions({ registry, clock });
    const expectedCategories = await validateCategoryDefinitions({
      registry,
      clock,
      manifest,
    });
    const lockedProductResult = validateProductDefinitions({
      manifest,
      registry,
      categories: expectedCategories,
    });
    const expectedProducts = buildExpectedPersistedProducts({
      definitions: lockedProductResult.definitions,
      clock,
    });
    const expectedInventoryResult = await validateInventoryDefinitions({
      definitions: lockedProductResult.definitions,
      registry,
      clock,
      threshold: lowStockThreshold,
    });
    const beforeCounts = await snapshotCollectionCounts(connection);
    const beforeUnrelatedUsers = await snapshotUnrelatedUsers(expectedUsers);
    const beforeUnrelatedCategories =
      await snapshotUnrelatedCategories(expectedCategories);
    const beforeUnrelatedProducts =
      await snapshotUnrelatedProducts(expectedProducts);
    const beforeUnrelatedInventory = await snapshotUnrelatedInventory(
      expectedInventoryResult.positions,
    );
    const beforeUnrelatedInventoryAdjustments =
      await snapshotUnrelatedInventoryAdjustments(
        expectedInventoryResult.adjustments,
      );
    const beforeProductCount = await Product.countDocuments({});
    const beforeChallenges = await countSeededAuthChallenges(expectedUsers);

    if (beforeChallenges !== 0) {
      throw new SeedValidationError(
        'DEMO_SEED_AUTH_CHALLENGE_PRESENT',
        'AuthChallenge state already exists for a deterministic demo identity.',
      );
    }

    const userResult = await seedDemoUsers({ registry, clock, password });
    const categoryResult = await seedCategories({
      registry,
      clock,
      manifest,
    });
    const productResult = await seedProducts({
      definitions: lockedProductResult.definitions,
      clock,
      productImageFolder: PRODUCT_IMAGE_FOLDER,
      assertUploadAllowed: () =>
        assertDemoCloudinaryUploadAllowed(config),
      uploadAsset: uploadProductImageAsset,
      deleteAsset: deleteProductImageAsset,
    });
    const inventoryResult = await seedInventoryCatalog({
      definitions: lockedProductResult.definitions,
      registry,
      clock,
      threshold: lowStockThreshold,
      productImageFolder: PRODUCT_IMAGE_FOLDER,
    });

    await assertPersistedInventoryStructure(inventoryResult.positions);

    const afterCounts = await snapshotCollectionCounts(connection);
    const afterUnrelatedUsers = await snapshotUnrelatedUsers(expectedUsers);
    const afterUnrelatedCategories =
      await snapshotUnrelatedCategories(expectedCategories);
    const afterUnrelatedProducts =
      await snapshotUnrelatedProducts(expectedProducts);
    const afterUnrelatedInventory = await snapshotUnrelatedInventory(
      expectedInventoryResult.positions,
    );
    const afterUnrelatedInventoryAdjustments =
      await snapshotUnrelatedInventoryAdjustments(
        expectedInventoryResult.adjustments,
      );
    const afterProductCount = await Product.countDocuments({});
    const afterChallenges = await countSeededAuthChallenges(expectedUsers);

    assertCollectionDeltas(beforeCounts, afterCounts, {
      users: userResult.created,
      categories: categoryResult.created,
      products: productResult.created,
      inventories: inventoryResult.created,
      inventoryAdjustments: inventoryResult.adjustmentsCreated,
    });

    if (beforeUnrelatedUsers !== afterUnrelatedUsers) {
      throw new SeedValidationError(
        'DEMO_SEED_UNRELATED_USERS_CHANGED',
        'Pre-existing unrelated Users changed during demo User seeding.',
      );
    }

    if (beforeUnrelatedCategories !== afterUnrelatedCategories) {
      throw new SeedValidationError(
        'DEMO_SEED_UNRELATED_CATEGORIES_CHANGED',
        'Pre-existing unrelated Categories changed during demo seeding.',
      );
    }

    if (afterProductCount !== beforeProductCount + productResult.created) {
      throw new SeedValidationError(
        'DEMO_SEED_PRODUCT_DELTA_INVALID',
        'Product collection count changed outside the exact seeded delta.',
      );
    }

    if (beforeUnrelatedProducts !== afterUnrelatedProducts) {
      throw new SeedValidationError(
        'DEMO_SEED_UNRELATED_PRODUCTS_CHANGED',
        'Pre-existing unrelated Products changed during demo seeding.',
      );
    }

    if (beforeUnrelatedInventory !== afterUnrelatedInventory) {
      throw new SeedValidationError(
        'DEMO_SEED_UNRELATED_INVENTORY_CHANGED',
        'Pre-existing unrelated Inventory changed during demo seeding.',
      );
    }

    if (
      beforeUnrelatedInventoryAdjustments !==
      afterUnrelatedInventoryAdjustments
    ) {
      throw new SeedValidationError(
        'DEMO_SEED_UNRELATED_INVENTORY_ADJUSTMENTS_CHANGED',
        'Pre-existing unrelated InventoryAdjustment records changed during demo seeding.',
      );
    }

    if (beforeChallenges !== afterChallenges || afterChallenges !== 0) {
      throw new SeedValidationError(
        'DEMO_SEED_AUTH_CHALLENGE_CHANGED',
        'Demo User seeding created or encountered AuthChallenge state for a demo identity.',
      );
    }

    await verifyPasswordAuthentication({ authenticatePassword, password });

    console.log('Demo Seed');
    console.log(`Database: ${connection.db.databaseName}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(
      `Manifest: ${manifest.products.length} products / ${manifest.products.length * 2} images`,
    );
    console.log(`Registry: valid (${registry.entries.length} reserved IDs)`);
    console.log(`Anchor date: ${clock.anchorDate} (${clock.timeZone})`);
    console.log(`Low-stock threshold: ${lowStockThreshold}`);
    console.log('Users:');
    console.log(`  Created: ${userResult.created}`);
    console.log(`  Skipped: ${userResult.skipped}`);
    console.log('Categories:');
    console.log(`  Created: ${categoryResult.created}`);
    console.log(`  Skipped: ${categoryResult.skipped}`);
    console.log('Product Definitions:');
    console.log(`  Validated: ${lockedProductResult.counts.products}`);
    console.log('Products:');
    console.log(`  Created: ${productResult.created}`);
    console.log(`  Skipped: ${productResult.skipped}`);
    console.log('Cloudinary:');
    console.log(`  Uploaded: ${productResult.uploaded}`);
    console.log('Inventory:');
    console.log(`  Created: ${inventoryResult.created}`);
    console.log(`  Skipped: ${inventoryResult.skipped}`);
    console.log('InventoryAdjustments:');
    console.log(`  Created: ${inventoryResult.adjustmentsCreated}`);
    console.log(`  Skipped: ${inventoryResult.adjustmentsSkipped}`);
    console.log('Authentication: Admin and Checkout Customer verified');
    console.log('AuthChallenges created: 0');

    return {
      users: userResult,
      categories: categoryResult,
      products: productResult,
      inventory: inventoryResult,
    };
  } finally {
    await disconnectSeedDatabase();
  }
}

async function main() {
  try {
    await runDemoSeed();
  } catch (error) {
    printSeedError(error);
    process.exitCode = 1;
  }
}

await main();
