import mongoose from 'mongoose';

import { env } from '../../config/env.js';

import { AppError } from '../../utils/AppError.js';

import { Category } from '../catalog/category.model.js';
import { Product } from '../catalog/product.model.js';

import {
  INVENTORY_ADJUSTMENT_REASONS,
  STOCK_STATES,
  isManualInventoryAdjustmentReason,
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

function throwAdminInventoryNotFound() {
  throw new AppError(
    404,
    'INVENTORY_NOT_FOUND',
    'Inventory position not found.',
  );
}

function throwInventoryQuantityConflict() {
  throw new AppError(
    409,
    'INVENTORY_QUANTITY_CONFLICT',
    'The inventory adjustment would make quantity negative.',
    {
      quantityChange:
        'Refresh the inventory and enter an adjustment within the available quantity.',
    },
  );
}

function throwCategoryNotFound() {
  throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
}

function throwCategorySportMismatch() {
  throw new AppError(
    422,
    'CATEGORY_SPORT_MISMATCH',
    'The selected category does not belong to the selected sport.',
    {
      categoryId: 'Select a category that belongs to the selected sport.',
    },
  );
}

function toAdminInventoryAdjustmentResource(adjustment) {
  return {
    id: adjustment._id.toString(),

    inventoryId: adjustment.inventoryId.toString(),

    reason: adjustment.reason,

    quantityChange: adjustment.quantityChange,

    previousQuantity: adjustment.previousQuantity,

    newQuantity: adjustment.newQuantity,

    performedBy: adjustment.performedBy?.toString() ?? null,

    note: adjustment.note ?? null,

    createdAt: adjustment.createdAt,
  };
}

function assertManualInventoryAdjustmentServiceInput({
  quantityChange,
  reason,
  note,
  performedBy,
}) {
  if (!Number.isSafeInteger(quantityChange) || quantityChange === 0) {
    throw new TypeError(
      'Manual inventory quantity change must be a non-zero integer.',
    );
  }

  if (!isManualInventoryAdjustmentReason(reason)) {
    throw new TypeError('Invalid manual inventory adjustment reason.');
  }

  if (reason === INVENTORY_ADJUSTMENT_REASONS.RESTOCK && quantityChange <= 0) {
    throw new TypeError('Restock quantity change must be greater than zero.');
  }

  if (
    reason === INVENTORY_ADJUSTMENT_REASONS.MANUAL_CORRECTION &&
    (typeof note !== 'string' || !note.trim())
  ) {
    throw new TypeError(
      'A note is required for a manual inventory correction.',
    );
  }

  if (!mongoose.isValidObjectId(performedBy)) {
    throw new TypeError('A valid Admin performer ID is required.');
  }
}

async function getInventoryProductContext(inventory, session) {
  const product = await Product.findById(inventory.productId)
    .select('name brand sport categoryId variants isActive')
    .populate('categoryId', 'name')
    .session(session)
    .lean();

  if (!product) {
    throwInventoryModeConflict(inventory.productId);
  }

  /*
   * Reuse the Task 5.3 relationship validation.
   * This throws if a simple Inventory incorrectly has a
   * variantId or a Variant Inventory points to no real Variant.
   */
  getInventoryVariantResource(inventory, product);

  return product;
}

export async function adjustInventoryManually({
  inventoryId,
  quantityChange,
  reason,
  note,
  performedBy,
}) {
  if (!mongoose.isValidObjectId(inventoryId)) {
    throwAdminInventoryNotFound();
  }

  const normalizedNote =
    typeof note === 'string' ? note.trim().replace(/\s+/g, ' ') : undefined;

  assertManualInventoryAdjustmentServiceInput({
    quantityChange,
    reason,
    note: normalizedNote,
    performedBy,
  });

  let result;

  await mongoose.connection.transaction(async (session) => {
    const inventoryFilter = {
      _id: inventoryId,
    };

    /*
     * A negative correction is permitted only when the
     * authoritative current quantity is sufficient.
     *
     * This condition is part of the write itself rather than
     * a separate read/check/save sequence.
     */
    if (quantityChange < 0) {
      inventoryFilter.quantity = {
        $gte: Math.abs(quantityChange),
      };
    }

    const updatedInventory = await Inventory.findOneAndUpdate(
      inventoryFilter,

      {
        $inc: {
          quantity: quantityChange,
        },
      },

      {
        session,
        returnDocument: 'after',
      },
    )
      .select('_id productId variantId quantity createdAt updatedAt')
      .lean();

    /*
     * null means one of two things:
     *
     * 1. Inventory does not exist.
     * 2. It exists, but a negative adjustment failed the
     *    quantity >= abs(change) condition.
     */
    if (!updatedInventory) {
      const inventoryExists = await Inventory.exists({
        _id: inventoryId,
      }).session(session);

      if (!inventoryExists) {
        throwAdminInventoryNotFound();
      }

      throwInventoryQuantityConflict();
    }

    /*
     * Validate the owning Product/Variant relationship before
     * allowing the transaction to commit.
     */
    const product = await getInventoryProductContext(updatedInventory, session);

    /*
     * Because updatedInventory is the document AFTER the atomic
     * $inc, the previous quantity can be derived exactly from
     * this successful write.
     */
    const previousQuantity = updatedInventory.quantity - quantityChange;

    const [adjustment] = await InventoryAdjustment.create(
      [
        {
          inventoryId: updatedInventory._id,

          reason,

          quantityChange,

          previousQuantity,

          newQuantity: updatedInventory.quantity,

          performedBy,

          ...(normalizedNote
            ? {
                note: normalizedNote,
              }
            : {}),
        },
      ],
      {
        session,
      },
    );

    result = {
      inventory: toAdminInventoryResource(updatedInventory, product),

      adjustment: toAdminInventoryAdjustmentResource(adjustment),
    };
  });

  return result;
}

function toAdminInventoryCategoryResource(category) {
  if (!category) {
    return null;
  }

  return {
    id: category._id.toString(),
    name: category.name,
  };
}

function toAdminInventoryProductResource(product) {
  return {
    id: product._id.toString(),
    name: product.name,
    brand: product.brand,
    sport: product.sport,
    category: toAdminInventoryCategoryResource(product.categoryId),
    isActive: product.isActive,
  };
}

function getInventoryVariantResource(inventory, product) {
  const variants = Array.isArray(product.variants) ? product.variants : [];

  // Simple Product must have Product-level Inventory only.
  if (variants.length === 0) {
    if (hasVariantIdField(inventory)) {
      throwInventoryModeConflict(product._id);
    }

    return null;
  }

  // Variant Product must point to one real embedded Variant.
  if (!hasVariantIdField(inventory) || inventory.variantId === null) {
    throwInventoryModeConflict(product._id);
  }

  const variantId = inventory.variantId.toString();

  const variant = variants.find((item) => item._id.toString() === variantId);

  if (!variant) {
    throwInventoryModeConflict(product._id);
  }

  return {
    id: variant._id.toString(),
    options: variant.options ?? {},
    isActive: variant.isActive,
  };
}

function toAdminInventoryResource(inventory, product) {
  return {
    id: inventory._id.toString(),

    product: toAdminInventoryProductResource(product),

    variant: getInventoryVariantResource(inventory, product),

    quantity: inventory.quantity,

    stockState: getStockState(inventory.quantity),

    createdAt: inventory.createdAt,

    updatedAt: inventory.updatedAt,
  };
}

async function getProductsForInventoryResources(inventories) {
  const productIds = [
    ...new Set(inventories.map((inventory) => inventory.productId.toString())),
  ];

  const products = await Product.find({
    _id: {
      $in: productIds,
    },
  })
    .select('name brand sport categoryId variants isActive')
    .populate('categoryId', 'name')
    .lean();

  const productsById = new Map(
    products.map((product) => [product._id.toString(), product]),
  );

  /*
   * An Inventory row without its owning Product is corrupted state.
   * Do not silently return incomplete Admin data.
   */
  for (const inventory of inventories) {
    const productId = inventory.productId.toString();

    if (!productsById.has(productId)) {
      throwInventoryModeConflict(productId);
    }
  }

  return productsById;
}

async function ensureInventoryFilterCategoryIntegrity({ categoryId, sport }) {
  if (!categoryId) {
    return;
  }

  const category = await Category.findById(categoryId).select('sport').lean();

  if (!category) {
    throwCategoryNotFound();
  }

  if (sport && category.sport !== sport) {
    throwCategorySportMismatch();
  }
}

function getInventoryQuantityFilter(stockState) {
  if (!stockState) {
    return undefined;
  }

  if (stockState === STOCK_STATES.OUT_OF_STOCK) {
    return 0;
  }

  if (stockState === STOCK_STATES.LOW_STOCK) {
    return {
      $gt: 0,
      $lte: env.lowStockThreshold,
    };
  }

  return {
    $gt: env.lowStockThreshold,
  };
}

async function resolveInventoryProductIds({ q, sport, categoryId, productId }) {
  const hasProductContextFilter = Boolean(q || sport || categoryId);

  /*
   * productId by itself can be applied directly to Inventory,
   * so no Product pre-query is necessary.
   */
  if (!hasProductContextFilter) {
    return null;
  }

  const productFilter = {};

  if (productId) {
    productFilter._id = productId;
  }

  if (q) {
    productFilter.$text = {
      $search: q,
    };
  }

  if (sport) {
    productFilter.sport = sport;
  }

  if (categoryId) {
    productFilter.categoryId = categoryId;
  }

  const products = await Product.find(productFilter).select('_id').lean();

  return products.map((product) => product._id);
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

export async function getAdminInventories({
  page,
  limit,
  q,
  sport,
  categoryId,
  stockState,
  productId,
  sort,
  order,
}) {
  await ensureInventoryFilterCategoryIntegrity({
    categoryId,
    sport,
  });

  const inventoryFilter = {};

  /*
   * Search/sport/category belong to Product, not Inventory.
   * Resolve all matching Product IDs in one query.
   */
  const matchingProductIds = await resolveInventoryProductIds({
    q,
    sport,
    categoryId,
    productId,
  });

  if (matchingProductIds !== null) {
    if (matchingProductIds.length === 0) {
      return {
        items: [],
        meta: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0,
        },
      };
    }

    inventoryFilter.productId = {
      $in: matchingProductIds,
    };
  } else if (productId) {
    inventoryFilter.productId = productId;
  }

  /*
   * stockState is derived, but filtering must happen before
   * pagination. Translate it to the authoritative quantity.
   */
  const quantityFilter = getInventoryQuantityFilter(stockState);

  if (quantityFilter !== undefined) {
    inventoryFilter.quantity = quantityFilter;
  }

  const direction = order === 'asc' ? 1 : -1;

  const sortDefinition = {
    [sort]: direction,
    _id: direction,
  };

  const skip = (page - 1) * limit;

  const [inventories, totalItems] = await Promise.all([
    Inventory.find(inventoryFilter)
      .select('_id productId variantId quantity createdAt updatedAt')
      .sort(sortDefinition)
      .skip(skip)
      .limit(limit)
      .lean(),

    Inventory.countDocuments(inventoryFilter),
  ]);

  if (inventories.length === 0) {
    return {
      items: [],
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  /*
   * One batch Product query for the current page.
   * Variant information comes from the Product document because
   * Variants are embedded.
   */
  const productsById = await getProductsForInventoryResources(inventories);

  return {
    items: inventories.map((inventory) => {
      const product = productsById.get(inventory.productId.toString());

      return toAdminInventoryResource(inventory, product);
    }),

    meta: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

export async function getAdminInventory(inventoryId) {
  if (!mongoose.isValidObjectId(inventoryId)) {
    throwAdminInventoryNotFound();
  }

  const inventory = await Inventory.findById(inventoryId)
    .select('_id productId variantId quantity createdAt updatedAt')
    .lean();

  if (!inventory) {
    throwAdminInventoryNotFound();
  }

  const productsById = await getProductsForInventoryResources([inventory]);

  const product = productsById.get(inventory.productId.toString());

  return toAdminInventoryResource(inventory, product);
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
