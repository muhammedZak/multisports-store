import mongoose from 'mongoose';

import {
  commerceItemSnapshotSchema,
  couponSnapshotSchema,
  shippingAddressSnapshotSchema,
  validateCommerceTotals,
} from '../commerce/commerceSnapshot.schema.js';

export const ORDER_STATUSES = Object.freeze({
  PLACED: 'placed',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
});

const isNonNegativeInteger = (value) =>
  Number.isSafeInteger(value) && value >= 0;

function moneyField(message) {
  return {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: isNonNegativeInteger,
      message,
    },
    immutable: true,
  };
}

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      immutable: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      immutable: true,
    },

    items: {
      type: [commerceItemSnapshotSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Order must contain at least one item.',
      },
      immutable: true,
    },

    shippingAddress: {
      type: shippingAddressSnapshotSchema,
      required: true,
      immutable: true,
    },

    coupon: {
      type: couponSnapshotSchema,
      default: null,
      immutable: true,
    },

    subtotal: moneyField(
      'Order subtotal must be a non-negative integer in paise.',
    ),

    discountAmount: moneyField(
      'Order discount must be a non-negative integer in paise.',
    ),

    totalAmount: moneyField(
      'Order total must be a non-negative integer in paise.',
    ),

    orderStatus: {
      type: String,
      enum: Object.values(ORDER_STATUSES),
      required: true,
      default: ORDER_STATUSES.PLACED,
    },

    placedAt: {
      type: Date,
      required: true,
      default: Date.now,
      immutable: true,
    },

    cancelledAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

orderSchema.pre('validate', function validateOrderIntegrity() {
  validateCommerceTotals(this, 'Order');

  if (this.orderStatus === ORDER_STATUSES.CANCELLED && !this.cancelledAt) {
    this.invalidate(
      'cancelledAt',
      'Cancelled Order must record the cancellation time.',
    );
  }

  if (this.orderStatus !== ORDER_STATUSES.CANCELLED && this.cancelledAt) {
    this.invalidate(
      'cancelledAt',
      'Cancellation time is valid only for a cancelled Order.',
    );
  }
});

orderSchema.index(
  {
    orderNumber: 1,
  },
  {
    unique: true,
    name: 'order_number_unique',
  },
);

orderSchema.index(
  {
    paymentId: 1,
  },
  {
    unique: true,
    name: 'order_payment_unique',
  },
);

orderSchema.index(
  {
    customerId: 1,
    createdAt: -1,
  },
  {
    name: 'order_customer_history',
  },
);

orderSchema.index(
  {
    orderStatus: 1,
    createdAt: -1,
  },
  {
    name: 'order_status_history',
  },
);

export const Order = mongoose.model('Order', orderSchema);
