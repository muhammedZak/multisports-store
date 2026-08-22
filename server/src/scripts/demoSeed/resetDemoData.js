import { requireDemoSeedPassword } from './seed.config.js';
import { resetCategories } from './categories.seed.js';
import { resetDemoUsers, validateDemoSeedPassword } from './users.seed.js';
import {
  connectSeedDatabase,
  disconnectSeedDatabase,
  printSeedError,
} from './seed.utils.js';
import { createSeedFoundationContext } from './seed.validation.js';

export const RESET_ORDER = Object.freeze([
  'notifications',
  'supportMessages',
  'supportConversations',
  'reviews',
  'refunds',
  'orders',
  'payments',
  'carts',
  'inventoryAdjustments',
  'inventory',
  'products',
  'categories',
  'coupons',
  'users',
]);

export const PRODUCT_ASSET_RESET_POLICY = Object.freeze({
  deleteBeforeProductRecords: true,
  publicIdSource: 'registered seeded Product documents only',
});

async function runSelectiveReset() {
  const { config, manifest, registry, clock } =
    await createSeedFoundationContext();
  const password = validateDemoSeedPassword(requireDemoSeedPassword(config));
  let connection;

  try {
    connection = await connectSeedDatabase(config);
    const categoryResult = await resetCategories({
      registry,
      clock,
      manifest,
    });
    const userResult = await resetDemoUsers({ registry, clock, password });

    console.log('Demo Seed Reset');
    console.log(`Database: ${connection.db.databaseName}`);
    console.log('Scope: deterministic Categories, then deterministic Users');
    console.log(`Categories deleted: ${categoryResult.deleted}`);
    console.log(`Users deleted: ${userResult.deleted}`);
  } finally {
    await disconnectSeedDatabase();
  }
}

async function main() {
  try {
    await runSelectiveReset();
  } catch (error) {
    printSeedError(error);
    process.exitCode = 1;
  }
}

await main();
