import mongoose from 'mongoose';

import { SPORT_VALUES } from '../catalog/catalog.constants.js';

const isNonNegativeInteger = (value) =>
  Number.isSafeInteger(value) && value >= 0;

const isPositiveInteger = (value) => Number.isSafeInteger(value) && value > 0;

function nonNegativeMoneyField(message) {
  return {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: isNonNegativeInteger,
      message,
    },
  };
}

function hasSimpleVariantOptions(value) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const entries = Object.entries(value);

  return (
    entries.length > 0 &&
    entries.every(
      ([key, optionValue]) =>
        key.trim() && typeof optionValue === 'string' && optionValue.trim(),
    )
  );
}

export const commerceItemSnapshotSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },

  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },

  productName: {
    type: String,
    required: true,
    trim: true,
  },

  brand: {
    type: String,
    required: true,
    trim: true,
  },

  sport: {
    type: String,
    enum: SPORT_VALUES,
    required: true,
  },

  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },

  categoryName: {
    type: String,
    required: true,
    trim: true,
  },

  variantOptions: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    validate: {
      validator: hasSimpleVariantOptions,
      message: 'Variant options must contain non-empty text values.',
    },
  },

  quantity: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: isPositiveInteger,
      message: 'Snapshot quantity must be a positive integer.',
    },
  },

  unitPrice: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: isPositiveInteger,
      message: 'Snapshot unit price must be a positive integer in paise.',
    },
  },

  itemDiscount: nonNegativeMoneyField(
    'Snapshot item discount must be a non-negative integer in paise.',
  ),

  lineTotal: nonNegativeMoneyField(
    'Snapshot line total must be a non-negative integer in paise.',
  ),
});

commerceItemSnapshotSchema.pre('validate', function validateItemSnapshot() {
  const hasVariantId = Boolean(this.variantId);

  const hasVariantOptions =
    this.variantOptions !== null && this.variantOptions !== undefined;

  if (hasVariantId !== hasVariantOptions) {
    this.invalidate(
      'variantOptions',
      'Variant identity and options must be snapshotted together.',
    );
  }

  if (
    !isPositiveInteger(this.quantity) ||
    !isPositiveInteger(this.unitPrice) ||
    !isNonNegativeInteger(this.itemDiscount) ||
    !isNonNegativeInteger(this.lineTotal)
  ) {
    return;
  }

  if (this.itemDiscount > this.unitPrice) {
    this.invalidate('itemDiscount', 'Item discount cannot exceed unit price.');

    return;
  }

  const expectedLineTotal =
    (this.unitPrice - this.itemDiscount) * this.quantity;

  if (
    !Number.isSafeInteger(expectedLineTotal) ||
    this.lineTotal !== expectedLineTotal
  ) {
    this.invalidate(
      'lineTotal',
      'Line total must match unit price, item discount and quantity.',
    );
  }
});

export const shippingAddressSnapshotSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    postalCode: {
      type: String,
      required: true,
      trim: true,
    },

    country: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

export const couponSnapshotSchema = new mongoose.Schema(
  {
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      required: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
      validate: {
        validator: isPositiveInteger,
        message: 'Coupon snapshot discount value must be a positive integer.',
      },
    },

    discountAmount: nonNegativeMoneyField(
      'Coupon snapshot discount amount must be a non-negative integer in paise.',
    ),
  },
  {
    _id: false,
  },
);

couponSnapshotSchema.pre('validate', function validateCouponSnapshot() {
  if (
    this.discountType === 'percentage' &&
    isPositiveInteger(this.discountValue) &&
    this.discountValue > 100
  ) {
    this.invalidate(
      'discountValue',
      'Percentage Coupon snapshot must be between 1 and 100.',
    );
  }
});

export function validateCommerceTotals(document, label) {
  if (!Array.isArray(document.items) || document.items.length === 0) {
    return;
  }

  const lineTotals = document.items.map((item) => item.lineTotal);

  if (!lineTotals.every(isNonNegativeInteger)) {
    return;
  }

  const expectedSubtotal = lineTotals.reduce((sum, value) => sum + value, 0);

  if (!Number.isSafeInteger(expectedSubtotal)) {
    document.invalidate('subtotal', `${label} subtotal is too large.`);

    return;
  }

  if (document.subtotal !== expectedSubtotal) {
    document.invalidate(
      'subtotal',
      `${label} subtotal must equal the sum of item line totals.`,
    );
  }

  if (
    !isNonNegativeInteger(document.subtotal) ||
    !isNonNegativeInteger(document.discountAmount) ||
    !isNonNegativeInteger(document.totalAmount)
  ) {
    return;
  }

  if (document.discountAmount > document.subtotal) {
    document.invalidate(
      'discountAmount',
      `${label} discount cannot exceed subtotal.`,
    );
  } else if (
    document.totalAmount !==
    document.subtotal - document.discountAmount
  ) {
    document.invalidate(
      'totalAmount',
      `${label} total must equal subtotal minus discount.`,
    );
  }

  if (document.coupon?.discountAmount !== undefined) {
    if (document.coupon.discountAmount !== document.discountAmount) {
      document.invalidate(
        'coupon',
        `Coupon snapshot discount must match ${label.toLowerCase()} discount.`,
      );
    }
  } else if (document.discountAmount !== 0) {
    document.invalidate(
      'discountAmount',
      `${label} discount must be zero when no Coupon is applied.`,
    );
  }
}

export const checkoutSnapshotSchema = new mongoose.Schema(
  {
    items: {
      type: [commerceItemSnapshotSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Checkout snapshot must contain at least one item.',
      },
    },

    shippingAddress: {
      type: shippingAddressSnapshotSchema,
      required: true,
    },

    coupon: {
      type: couponSnapshotSchema,
      default: null,
    },

    subtotal: nonNegativeMoneyField(
      'Checkout subtotal must be a non-negative integer in paise.',
    ),

    discountAmount: nonNegativeMoneyField(
      'Checkout discount must be a non-negative integer in paise.',
    ),

    totalAmount: nonNegativeMoneyField(
      'Checkout total must be a non-negative integer in paise.',
    ),
  },
  {
    _id: false,
  },
);

checkoutSnapshotSchema.pre('validate', function validateCheckoutSnapshot() {
  validateCommerceTotals(this, 'Checkout');
});
