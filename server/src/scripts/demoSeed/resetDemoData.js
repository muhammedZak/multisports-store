import { printSeedError } from './seed.utils.js';
import { verifySeedFoundation } from './seed.validation.js';

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

async function runResetFoundation() {
  try {
    await verifySeedFoundation({ mode: 'foundation reset verification' });
    console.log(`Reset order reserved: ${RESET_ORDER.join(' -> ')}`);
    console.log('Records deleted: 0');
  } catch (error) {
    printSeedError(error);
    process.exitCode = 1;
  }
}

await runResetFoundation();
