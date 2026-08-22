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
import {
  resetCoupons,
  validateCouponDefinitions,
} from './coupon.seed.js';
import { resetCarts } from './cart.seed.js';
import {
  resetInventoryCatalog,
  resolveSeedLowStockThreshold,
  validateInventoryDefinitions,
} from './inventory.seed.js';
import {
  resetDemoUsers,
  validateDemoSeedPassword,
  validateDemoUserDefinitions,
} from './users.seed.js';
import { validateHistoricalCommerceScenarioMatrix } from './commerce.scenarios.seed.js';
import {
  resetHistoricalCommerce,
  validateHistoricalPersistenceDefinitions,
} from './commerce.persistence.seed.js';
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
  const lowStockThreshold = resolveSeedLowStockThreshold();
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
    const expectedUsers = await validateDemoUserDefinitions({ registry, clock });
    const expectedCoupons = await validateCouponDefinitions({ registry, clock });
    const expectedInventory = await validateInventoryDefinitions({
      definitions: lockedProducts.definitions,
      registry,
      clock,
      threshold: lowStockThreshold,
    });
    const commerceMatrix = await validateHistoricalCommerceScenarioMatrix({
      registry,
      clock,
      productDefinitions: lockedProducts.definitions,
      categories: expectedCategories,
      users: expectedUsers,
      coupons: expectedCoupons.coupons,
      inventoryPositions: expectedInventory.positions,
      lowStockThreshold,
    });
    const historicalDefinitions =
      await validateHistoricalPersistenceDefinitions({
        matrix: commerceMatrix,
        registry,
        foundationalPositions: expectedInventory.positions,
      });
    const historicalResult = await resetHistoricalCommerce(
      historicalDefinitions,
    );
    const cartResult = await resetCarts({ registry, clock });
    const inventoryResult = await resetInventoryCatalog({
      definitions: lockedProducts.definitions,
      registry,
      clock,
      threshold: lowStockThreshold,
      productImageFolder: PRODUCT_IMAGE_FOLDER,
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
    const couponResult = await resetCoupons({ registry, clock });
    const userResult = await resetDemoUsers({ registry, clock, password });

    console.log('Demo Seed Reset');
    console.log(`Database: ${connection.db.databaseName}`);
    console.log(
      'Scope: deterministic Historical Commerce, Carts, InventoryAdjustments, Inventory, Products, Categories, Coupons, then Users',
    );
    console.log(
      `Historical Inventory restored: ${historicalResult.inventoryRestored}`,
    );
    console.log(
      `Historical InventoryAdjustments deleted: ${historicalResult.adjustmentsDeleted}`,
    );
    console.log(`Historical Orders deleted: ${historicalResult.ordersDeleted}`);
    console.log(
      `Historical Payments deleted: ${historicalResult.paymentsDeleted}`,
    );
    console.log(`Carts deleted: ${cartResult.deleted}`);
    console.log(
      `InventoryAdjustments deleted: ${inventoryResult.adjustmentsDeleted}`,
    );
    console.log(`Inventory deleted: ${inventoryResult.inventoryDeleted}`);
    console.log(`Products deleted: ${productResult.deleted}`);
    console.log(
      `Product Cloudinary assets deleted: ${productResult.cloudinaryDeleted}`,
    );
    console.log(`Categories deleted: ${categoryResult.deleted}`);
    console.log(`Coupons deleted: ${couponResult.deleted}`);
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
