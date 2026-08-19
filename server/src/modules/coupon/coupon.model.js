import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
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
    },

    minimumOrderAmount: {
      type: Number,
      required: true,
      default: 0,
    },

    maximumDiscount: {
      type: Number,
      default: null,
    },

    startsAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    usageLimit: {
      type: Number,
      default: null,
    },

    usedCount: {
      type: Number,
      required: true,
      default: 0,
    },

    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

couponSchema.pre('validate', function validateCouponConfiguration() {
  if (!Number.isSafeInteger(this.discountValue) || this.discountValue <= 0) {
    this.invalidate(
      'discountValue',
      'Discount value must be a positive integer.',
    );
  } else if (this.discountType === 'percentage' && this.discountValue > 100) {
    this.invalidate(
      'discountValue',
      'Percentage discount must be between 1 and 100.',
    );
  }

  if (
    !Number.isSafeInteger(this.minimumOrderAmount) ||
    this.minimumOrderAmount < 0
  ) {
    this.invalidate(
      'minimumOrderAmount',
      'Minimum order amount must be a non-negative integer in paise.',
    );
  }

  if (this.maximumDiscount !== null) {
    if (this.discountType !== 'percentage') {
      this.invalidate(
        'maximumDiscount',
        'Maximum discount is supported only for percentage Coupons.',
      );
    } else if (
      !Number.isSafeInteger(this.maximumDiscount) ||
      this.maximumDiscount < 0
    ) {
      this.invalidate(
        'maximumDiscount',
        'Maximum discount must be a non-negative integer in paise.',
      );
    }
  }

  if (this.startsAt && this.expiresAt && this.expiresAt <= this.startsAt) {
    this.invalidate('expiresAt', 'Expiry must be later than the start date.');
  }

  if (
    this.usageLimit !== null &&
    (!Number.isSafeInteger(this.usageLimit) || this.usageLimit <= 0)
  ) {
    this.invalidate('usageLimit', 'Usage limit must be a positive integer.');
  }

  if (!Number.isSafeInteger(this.usedCount) || this.usedCount < 0) {
    this.invalidate('usedCount', 'Used count must be a non-negative integer.');
  }

  if (
    this.usageLimit !== null &&
    Number.isSafeInteger(this.usedCount) &&
    this.usedCount > this.usageLimit
  ) {
    this.invalidate(
      'usageLimit',
      'Usage limit cannot be lower than the current used count.',
    );
  }
});

couponSchema.index(
  {
    code: 1,
  },
  {
    unique: true,
    name: 'coupon_code_unique',
  },
);

export const Coupon = mongoose.model('Coupon', couponSchema);
