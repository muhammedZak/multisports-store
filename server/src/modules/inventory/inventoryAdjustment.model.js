import mongoose from 'mongoose';

import {
  INVENTORY_ADJUSTMENT_REASONS,
  INVENTORY_ADJUSTMENT_REASON_VALUES,
} from './inventory.constants.js';

import {
  hasConsistentAdjustmentArithmetic,
  isNonNegativeInteger,
  isNonZeroInteger,
} from './inventory.validation.js';

const inventoryAdjustmentSchema = new mongoose.Schema(
  {
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true,
    },

    reason: {
      type: String,
      required: true,
      enum: {
        values: INVENTORY_ADJUSTMENT_REASON_VALUES,
        message: 'Invalid inventory adjustment reason.',
      },
    },

    quantityChange: {
      type: Number,
      required: true,
      validate: {
        validator: isNonZeroInteger,
        message: 'Quantity change must be a non-zero integer.',
      },
    },

    previousQuantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: isNonNegativeInteger,
        message: 'Previous quantity must be a non-negative integer.',
      },
    },

    newQuantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: isNonNegativeInteger,
        message: 'New quantity must be a non-negative integer.',
      },
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },

    sourceType: {
      type: String,
      trim: true,
      default: undefined,
    },

    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: undefined,
    },

    note: {
      type: String,
      trim: true,
      default: undefined,
    },
  },
  {
    timestamps: true,
    collection: 'inventoryAdjustments',
  },
);

inventoryAdjustmentSchema.pre(
  'validate',
  function validateAdjustmentIntegrity() {
    const arithmeticIsValid = hasConsistentAdjustmentArithmetic({
      previousQuantity: this.previousQuantity,
      quantityChange: this.quantityChange,
      newQuantity: this.newQuantity,
    });

    if (!arithmeticIsValid) {
      this.invalidate(
        'newQuantity',
        'Previous quantity plus quantity change must equal new quantity.',
      );
    }

    const hasSourceType =
      typeof this.sourceType === 'string' && this.sourceType.length > 0;

    const hasSourceId = this.sourceId !== undefined && this.sourceId !== null;

    if (hasSourceType !== hasSourceId) {
      this.invalidate(
        'sourceType',
        'sourceType and sourceId must be provided together.',
      );

      this.invalidate(
        'sourceId',
        'sourceType and sourceId must be provided together.',
      );
    }

    if (
      this.reason === INVENTORY_ADJUSTMENT_REASONS.MANUAL_CORRECTION &&
      (!this.note || !this.note.trim())
    ) {
      this.invalidate(
        'note',
        'A note is required for a manual inventory correction.',
      );
    }
  },
);

inventoryAdjustmentSchema.index(
  {
    inventoryId: 1,
    createdAt: -1,
  },
  {
    name: 'inventory_adjustment_history',
  },
);

inventoryAdjustmentSchema.index(
  {
    sourceType: 1,
    sourceId: 1,
  },
  {
    sparse: true,
    name: 'inventory_adjustment_source',
  },
);

inventoryAdjustmentSchema.index(
  {
    inventoryId: 1,
    sourceType: 1,
    sourceId: 1,
    reason: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      sourceType: {
        $type: 'string',
      },
      sourceId: {
        $type: 'objectId',
      },
    },
    name: 'inventory_adjustment_system_effect_unique',
  },
);

export const InventoryAdjustment = mongoose.model(
  'InventoryAdjustment',
  inventoryAdjustmentSchema,
);
