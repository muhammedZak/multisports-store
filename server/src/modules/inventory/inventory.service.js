import { env } from '../../config/env.js';

import { AppError } from '../../utils/AppError.js';

import { Product } from '../catalog/product.model.js';

import {
  INVENTORY_ADJUSTMENT_REASONS,
  STOCK_STATES,
} from './inventory.constants.js';

import { Inventory } from './inventory.model.js';
import { InventoryAdjustment } from './inventoryAdjustment.model.js';

import { isNonNegativeInteger } from './inventory.validation.js';

function throwInventoryModeConflict(productId) {
  throw new AppError(
    409,
    'INVENTORY_MODE_CONFLICT',
    `Inventory structure conflicts with the Product variant mode for Product ${productId}.`,
  );
}

function throwInventoryNotFound(productId, variantId = null) {
  const target = variantId
    ? `Variant ${variantId} on Product ${productId}`
    : `Product ${productId}`;

  throw new AppError(
    409,
    'INVENTORY_NOT_FOUND',
    `Required Inventory position is missing for ${target}.`,
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

async function getProductInventories(productId, session = null) {
  let query = Inventory.find({
    productId,
  }).select('_id productId variantId quantity');

  if (session) {
    query = query.session(session);
  }

  return query.lean();
}

export async function assertProductInventoryStructure(
  product,
  { session = null } = {},
) {
  const inventories = await getProductInventories(product._id, session);

  const variants = Array.isArray(product.variants) ? product.variants : [];

  if (variants.length === 0) {
    validateSimpleProductInventoryStructure(product, inventories);

    if (inventories.length === 0) {
      throwInventoryNotFound(product._id);
    }

    return inventories;
  }

  const existingVariantIds = validateVariantProductInventoryStructure(
    product,
    inventories,
  );

  for (const variant of variants) {
    const variantId = variant._id.toString();

    if (!existingVariantIds.has(variantId)) {
      throwInventoryNotFound(product._id, variant._id);
    }
  }

  return inventories;
}

export async function createInitialInventoryForVariant({
  productId,
  variantId,
  initialQuantity,
  session,
}) {
  if (!isNonNegativeInteger(initialQuantity)) {
    throw new TypeError(
      'Variant initial quantity must be a non-negative integer.',
    );
  }

  const [inventory] = await Inventory.create(
    [
      {
        productId,
        variantId,
        quantity: initialQuantity,
      },
    ],
    {
      session,
    },
  );

  if (initialQuantity > 0) {
    await InventoryAdjustment.create(
      [
        {
          inventoryId: inventory._id,
          reason: INVENTORY_ADJUSTMENT_REASONS.INITIAL_STOCK,
          quantityChange: initialQuantity,
          previousQuantity: 0,
          newQuantity: initialQuantity,
        },
      ],
      {
        session,
      },
    );
  }

  return inventory;
}

export async function createInitialInventoryForProduct({
  product,
  initialQuantity,
  variantInitialQuantities,
  session,
}) {
  const variants = Array.isArray(product.variants) ? product.variants : [];

  if (variants.length === 0) {
    if (
      !isNonNegativeInteger(initialQuantity) ||
      variantInitialQuantities !== undefined
    ) {
      throwInventoryModeConflict(product._id);
    }

    const [inventory] = await Inventory.create(
      [
        {
          productId: product._id,
          quantity: initialQuantity,
        },
      ],
      {
        session,
      },
    );

    if (initialQuantity > 0) {
      await InventoryAdjustment.create(
        [
          {
            inventoryId: inventory._id,
            reason: INVENTORY_ADJUSTMENT_REASONS.INITIAL_STOCK,
            quantityChange: initialQuantity,
            previousQuantity: 0,
            newQuantity: initialQuantity,
          },
        ],
        {
          session,
        },
      );
    }

    return [inventory];
  }

  if (
    initialQuantity !== undefined ||
    !Array.isArray(variantInitialQuantities) ||
    variantInitialQuantities.length !== variants.length ||
    variantInitialQuantities.some((quantity) => !isNonNegativeInteger(quantity))
  ) {
    throwInventoryModeConflict(product._id);
  }

  const inventories = await Inventory.create(
    variants.map((variant, index) => ({
      productId: product._id,
      variantId: variant._id,
      quantity: variantInitialQuantities[index],
    })),
    {
      session,
    },
  );

  const adjustments = [];

  for (let index = 0; index < inventories.length; index += 1) {
    const quantity = variantInitialQuantities[index];

    if (quantity === 0) {
      continue;
    }

    adjustments.push({
      inventoryId: inventories[index]._id,
      reason: INVENTORY_ADJUSTMENT_REASONS.INITIAL_STOCK,
      quantityChange: quantity,
      previousQuantity: 0,
      newQuantity: quantity,
    });
  }

  if (adjustments.length > 0) {
    await InventoryAdjustment.create(adjustments, {
      session,
    });
  }

  return inventories;
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
