import { AuthChallenge } from '../../modules/auth/authChallenge.model.js';
import { User } from '../../modules/users/user.model.js';
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

export async function runDemoUserSeed() {
  const { config, manifest, registry, clock } =
    await createSeedFoundationContext();
  const password = validateDemoSeedPassword(requireDemoSeedPassword(config));

  if (config.allowCloudinaryUpload) {
    throw new SeedSafetyError(
      'DEMO_USER_SEED_CLOUDINARY_FLAG_ENABLED',
      'ALLOW_DEMO_CLOUDINARY_UPLOAD must remain false during demo User seeding.',
    );
  }

  const { authenticatePassword } = await import(
    '../../modules/auth/auth.service.js'
  );
  let connection;

  try {
    connection = await connectSeedDatabase(config);
    const expectedUsers = await validateDemoUserDefinitions({ registry, clock });
    const beforeCounts = await snapshotCollectionCounts(connection);
    const beforeUnrelatedUsers = await snapshotUnrelatedUsers(expectedUsers);
    const beforeChallenges = await countSeededAuthChallenges(expectedUsers);

    if (beforeChallenges !== 0) {
      throw new SeedValidationError(
        'DEMO_SEED_AUTH_CHALLENGE_PRESENT',
        'AuthChallenge state already exists for a deterministic demo identity.',
      );
    }

    const result = await seedDemoUsers({ registry, clock, password });

    const afterCounts = await snapshotCollectionCounts(connection);
    const afterUnrelatedUsers = await snapshotUnrelatedUsers(expectedUsers);
    const afterChallenges = await countSeededAuthChallenges(expectedUsers);

    assertCollectionDeltas(beforeCounts, afterCounts, {
      users: result.created,
    });

    if (beforeUnrelatedUsers !== afterUnrelatedUsers) {
      throw new SeedValidationError(
        'DEMO_SEED_UNRELATED_USERS_CHANGED',
        'Pre-existing unrelated Users changed during demo User seeding.',
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
    console.log(`  Created: ${result.created}`);
    console.log(`  Skipped: ${result.skipped}`);
    console.log('Authentication: Admin and Checkout Customer verified');
    console.log('AuthChallenges created: 0');
    console.log('Cloudinary: disabled');

    return result;
  } finally {
    await disconnectSeedDatabase();
  }
}

async function main() {
  try {
    await runDemoUserSeed();
  } catch (error) {
    printSeedError(error);
    process.exitCode = 1;
  }
}

await main();
