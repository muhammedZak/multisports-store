import { env } from '../../config/env.js';

import { AppError } from '../../utils/AppError.js';

import { Product } from '../catalog/product.model.js';

import { STOCK_STATES } from './inventory.constants.js';
import { Inventory } from './inventory.model.js';

import { isNonNegativeInteger } from './inventory.validation.js';

function throwInventoryModeConflict(productId) {
  throw new AppError(
    409,
    'INVENTORY_MODE_CONFLICT',
    `Inventory structure conflicts with the Product variant mode for Product ${productId}.`,
  );
}

function hasVariantIdField(inventory) {
  return Object.prototype.hasOwnProperty.call(inventory, 'variantId');
}

function groupInventoriesByProduct(inventories) {
  const grouped = new Map();

  for (const inventory of inventories) {
    const productId = inventory.productId.toString();

    if (!grouped.has(productId)) {
      grouped.set(productId, []);
    }

    grouped.get(productId).push(inventory);
  }

  return grouped;
}

function validateSimpleProductInventoryStructure(product, inventories) {
  if (inventories.length > 1) {
    throwInventoryModeConflict(product._id);
  }

  const invalidInventory = inventories.some((inventory) =>
    hasVariantIdField(inventory),
  );

  if (invalidInventory) {
    throwInventoryModeConflict(product._id);
  }
}

function validateVariantProductInventoryStructure(product, inventories) {
  const productVariantIds = new Set(
    product.variants.map((variant) => variant._id.toString()),
  );

  const seenInventoryVariantIds = new Set();

  for (const inventory of inventories) {
    if (!hasVariantIdField(inventory) || inventory.variantId === null) {
      throwInventoryModeConflict(product._id);
    }

    const variantId = inventory.variantId.toString();

    if (!productVariantIds.has(variantId)) {
      throwInventoryModeConflict(product._id);
    }

    if (seenInventoryVariantIds.has(variantId)) {
      throwInventoryModeConflict(product._id);
    }

    seenInventoryVariantIds.add(variantId);
  }

  return seenInventoryVariantIds;
}

export function getStockState(quantity) {
  if (!isNonNegativeInteger(quantity)) {
    throw new TypeError(
      'Inventory quantity must be a non-negative integer before calculating stock state.',
    );
  }

  if (quantity === 0) {
    return STOCK_STATES.OUT_OF_STOCK;
  }

  if (quantity <= env.lowStockThreshold) {
    return STOCK_STATES.LOW_STOCK;
  }

  return STOCK_STATES.IN_STOCK;
}

export async function bootstrapExistingCatalogInventory() {
  const products = await Product.find().select('_id variants._id').lean();

  if (products.length === 0) {
    return {
      productsScanned: 0,
      expectedPositions: 0,
      existingPositions: 0,
      createdPositions: 0,
    };
  }

  const productIds = products.map((product) => product._id);

  const inventories = await Inventory.find({
    productId: {
      $in: productIds,
    },
  })
    .select('_id productId variantId quantity')
    .lean();

  const inventoriesByProduct = groupInventoriesByProduct(inventories);

  const operations = [];

  let expectedPositions = 0;
  let existingPositions = 0;

  /*
   * First pass:
   * validate every existing Product/Inventory relationship before writing
   * anything.
   */
  for (const product of products) {
    const productId = product._id.toString();

    const productInventories = inventoriesByProduct.get(productId) ?? [];

    const variants = Array.isArray(product.variants) ? product.variants : [];

    if (variants.length === 0) {
      expectedPositions += 1;

      validateSimpleProductInventoryStructure(product, productInventories);

      if (productInventories.length === 1) {
        existingPositions += 1;
      } else {
        operations.push({
          updateOne: {
            filter: {
              productId: product._id,
              variantId: {
                $exists: false,
              },
            },

            update: {
              $setOnInsert: {
                productId: product._id,
                quantity: 0,
              },
            },

            upsert: true,
          },
        });
      }

      continue;
    }

    expectedPositions += variants.length;

    const existingVariantIds = validateVariantProductInventoryStructure(
      product,
      productInventories,
    );

    existingPositions += existingVariantIds.size;

    for (const variant of variants) {
      const variantId = variant._id.toString();

      if (existingVariantIds.has(variantId)) {
        continue;
      }

      operations.push({
        updateOne: {
          filter: {
            productId: product._id,
            variantId: variant._id,
          },

          update: {
            $setOnInsert: {
              productId: product._id,
              variantId: variant._id,
              quantity: 0,
            },
          },

          upsert: true,
        },
      });
    }
  }

  if (operations.length === 0) {
    return {
      productsScanned: products.length,
      expectedPositions,
      existingPositions,
      createdPositions: 0,
    };
  }

  const result = await Inventory.bulkWrite(operations, {
    ordered: false,
  });

  return {
    productsScanned: products.length,
    expectedPositions,
    existingPositions,
    createdPositions: result.upsertedCount,
  };
}
