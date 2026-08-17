import mongoose from 'mongoose';

import { isNonNegativeInteger } from './inventory.validation.js';

const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: undefined,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: isNonNegativeInteger,
        message: 'Inventory quantity must be a non-negative integer.',
      },
    },
  },
  {
    timestamps: true,
  },
);

inventorySchema.pre(
  'validate',
  function preserveSimpleInventoryVariantConvention() {
    if (this.variantId === null) {
      this.invalidate(
        'variantId',
        'variantId must be omitted for a simple product inventory.',
      );
    }
  },
);

inventorySchema.index(
  {
    productId: 1,
    variantId: 1,
  },
  {
    unique: true,
    name: 'inventory_product_variant_unique',
  },
);

inventorySchema.index(
  {
    quantity: 1,
  },
  {
    name: 'inventory_quantity',
  },
);

export const Inventory = mongoose.model('Inventory', inventorySchema);
