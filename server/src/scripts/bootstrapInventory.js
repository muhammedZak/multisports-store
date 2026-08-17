import mongoose from 'mongoose';

import { connectDatabase } from '../config/database.js';

import { bootstrapExistingCatalogInventory } from '../modules/inventory/inventory.service.js';

async function runBootstrap() {
  try {
    await connectDatabase();

    const result = await bootstrapExistingCatalogInventory();

    console.log('');
    console.log('Inventory bootstrap completed.');
    console.log(`Products scanned: ${result.productsScanned}`);
    console.log(`Expected inventory positions: ${result.expectedPositions}`);
    console.log(`Existing inventory positions: ${result.existingPositions}`);
    console.log(`Created inventory positions: ${result.createdPositions}`);
  } catch (error) {
    console.error('');
    console.error('Inventory bootstrap failed.');

    if (error.code) {
      console.error(`Code: ${error.code}`);
    }

    console.error(error.message);

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

await runBootstrap();
