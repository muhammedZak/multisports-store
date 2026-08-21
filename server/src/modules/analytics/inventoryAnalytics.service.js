import { env } from '../../config/env.js';

import { Product } from '../catalog/product.model.js';
import { Inventory } from '../inventory/inventory.model.js';

function getVariantById(product, variantId) {
  if (!variantId) {
    return null;
  }

  return product.variants.find(
    (variant) => variant._id.toString() === variantId.toString(),
  );
}

function isPurchasableInventoryPosition(inventory, product) {
  if (!product?.isActive) {
    return false;
  }

  const variants = Array.isArray(product.variants) ? product.variants : [];

  /*
   * Simple Product:
   * Inventory position has no variantId.
   */
  if (variants.length === 0) {
    return inventory.variantId === undefined || inventory.variantId === null;
  }

  /*
   * Variant Product:
   * only currently active Variants represent
   * purchasable Inventory positions.
   */
  const variant = getVariantById(product, inventory.variantId);

  return Boolean(variant?.isActive);
}

function getStockState(quantity) {
  if (quantity === 0) {
    return 'out_of_stock';
  }

  if (quantity <= env.lowStockThreshold) {
    return 'low_stock';
  }

  return 'in_stock';
}

export async function getCurrentInventoryAnalytics() {
  /*
   * Inventory Analytics is intentionally
   * NOT range-filtered.
   *
   * Phase 6 stores current quantity, not historical
   * stock snapshots.
   */
  const products = await Product.find({
    isActive: true,
  })
    .select('_id variants isActive')
    .lean();

  if (products.length === 0) {
    return {
      scope: 'current',

      positions: {
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
      },

      products: {
        lowStock: 0,
        outOfStock: 0,
      },
    };
  }

  const productIds = products.map((product) => product._id);

  const inventories = await Inventory.find({
    productId: {
      $in: productIds,
    },
  })
    .select('productId variantId quantity')
    .lean();

  const productById = new Map(
    products.map((product) => [product._id.toString(), product]),
  );

  const positionCounts = {
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
  };

  const lowStockProductIds = new Set();
  const outOfStockProductIds = new Set();

  for (const inventory of inventories) {
    const product = productById.get(inventory.productId.toString());

    if (!product) {
      continue;
    }

    if (!isPurchasableInventoryPosition(inventory, product)) {
      continue;
    }

    const stockState = getStockState(inventory.quantity);

    if (stockState === 'in_stock') {
      positionCounts.inStock += 1;

      continue;
    }

    if (stockState === 'low_stock') {
      positionCounts.lowStock += 1;

      lowStockProductIds.add(product._id.toString());

      continue;
    }

    positionCounts.outOfStock += 1;

    outOfStockProductIds.add(product._id.toString());
  }

  return {
    scope: 'current',

    positions: positionCounts,

    products: {
      lowStock: lowStockProductIds.size,

      outOfStock: outOfStockProductIds.size,
    },
  };
}
