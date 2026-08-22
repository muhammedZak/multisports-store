import {
  assertDemoCloudinaryUploadAllowed,
  requireDemoSeedPassword,
} from './seed.config.js';
import {
  resetCategories,
  validateCategoryDefinitions,
} from './categories.seed.js';
import { resetProducts } from './product.persistence.seed.js';
import { validateProductDefinitions } from './products.seed.js';
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
  const { PRODUCT_IMAGE_FOLDER, deleteProductImageAsset } = await import(
    '../../integrations/cloudinary.js'
  );
  let connection;

  try {
    connection = await connectSeedDatabase(config);
    const expectedCategories = await validateCategoryDefinitions({
      registry,
      clock,
      manifest,
    });
    const lockedProducts = validateProductDefinitions({
      manifest,
      registry,
      categories: expectedCategories,
    });
    const productResult = await resetProducts({
      definitions: lockedProducts.definitions,
      clock,
      productImageFolder: PRODUCT_IMAGE_FOLDER,
      assertCloudinaryMutationAllowed: () =>
        assertDemoCloudinaryUploadAllowed(config),
      deleteAsset: deleteProductImageAsset,
    });
    const categoryResult = await resetCategories({
      registry,
      clock,
      manifest,
    });
    const userResult = await resetDemoUsers({ registry, clock, password });

    console.log('Demo Seed Reset');
    console.log(`Database: ${connection.db.databaseName}`);
    console.log('Scope: deterministic Products, Categories, then Users');
    console.log(`Products deleted: ${productResult.deleted}`);
    console.log(
      `Product Cloudinary assets deleted: ${productResult.cloudinaryDeleted}`,
    );
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
