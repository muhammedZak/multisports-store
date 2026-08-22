import { AuthChallenge } from '../../modules/auth/authChallenge.model.js';
import { Category } from '../../modules/catalog/category.model.js';
import { Product } from '../../modules/catalog/product.model.js';
import { User } from '../../modules/users/user.model.js';
import {
  seedCategories,
  validateCategoryDefinitions,
} from './categories.seed.js';
import { validateProductDefinitions } from './products.seed.js';
import { requireDemoSeedPassword } from './seed.config.js';
import {
  seedDemoUsers,
  validateDemoSeedPassword,
  validateDemoUserDefinitions,
} from './users.seed.js';
import {
  SeedValidationError,
  SeedSafetyError,
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

  if (config.allowCloudinaryUpload) {
    throw new SeedSafetyError(
      'DEMO_USER_SEED_CLOUDINARY_FLAG_ENABLED',
      'ALLOW_DEMO_CLOUDINARY_UPLOAD must remain false during this demo seed.',
    );
  }

  const { authenticatePassword } = await import(
    '../../modules/auth/auth.service.js'
  );
  let connection;

  try {
    connection = await connectSeedDatabase(config);
    const expectedUsers = await validateDemoUserDefinitions({ registry, clock });
    const expectedCategories = await validateCategoryDefinitions({
      registry,
      clock,
      manifest,
    });
    const beforeCounts = await snapshotCollectionCounts(connection);
    const beforeUnrelatedUsers = await snapshotUnrelatedUsers(expectedUsers);
    const beforeUnrelatedCategories =
      await snapshotUnrelatedCategories(expectedCategories);
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
    const productResult = validateProductDefinitions({
      manifest,
      registry,
      categories: categoryResult.expectedCategories,
    });

    const afterCounts = await snapshotCollectionCounts(connection);
    const afterUnrelatedUsers = await snapshotUnrelatedUsers(expectedUsers);
    const afterUnrelatedCategories =
      await snapshotUnrelatedCategories(expectedCategories);
    const afterProductCount = await Product.countDocuments({});
    const afterChallenges = await countSeededAuthChallenges(expectedUsers);

    assertCollectionDeltas(beforeCounts, afterCounts, {
      users: userResult.created,
      categories: categoryResult.created,
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

    if (beforeProductCount !== afterProductCount) {
      throw new SeedValidationError(
        'DEMO_SEED_PRODUCT_PERSISTENCE_FORBIDDEN',
        'Product collection count changed during definition-only validation.',
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
    console.log('Users:');
    console.log(`  Created: ${userResult.created}`);
    console.log(`  Skipped: ${userResult.skipped}`);
    console.log('Categories:');
    console.log(`  Created: ${categoryResult.created}`);
    console.log(`  Skipped: ${categoryResult.skipped}`);
    console.log('Product Definitions:');
    console.log(`  Validated: ${productResult.counts.products}`);
    console.log('  Persisted: 0');
    console.log('Authentication: Admin and Checkout Customer verified');
    console.log('AuthChallenges created: 0');
    console.log('Cloudinary: disabled');

    return {
      users: userResult,
      categories: categoryResult,
      products: productResult,
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
