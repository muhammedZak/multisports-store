import mongoose from 'mongoose';

import { SPORT_VALUES } from './catalog.constants.js';

const productImageSchema = new mongoose.Schema({
  publicId: {
    type: String,
    required: true,
    trim: true,
  },

  url: {
    type: String,
    required: true,
    trim: true,
  },

  altText: {
    type: String,
    trim: true,
    default: '',
  },

  isPrimary: {
    type: Boolean,
    required: true,
    default: false,
  },

  sortOrder: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Image sort order must be an integer.',
    },
  },
});

function hasSimpleVariantOptions(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const entries = Object.entries(value);

  if (entries.length === 0) {
    return false;
  }

  return entries.every(([optionName, optionValue]) => {
    return (
      optionName.trim().length > 0 &&
      typeof optionValue === 'string' &&
      optionValue.trim().length > 0
    );
  });
}

const productVariantSchema = new mongoose.Schema({
  options: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    validate: {
      validator: hasSimpleVariantOptions,
      message: 'Variant options must contain non-empty text values.',
    },
  },

  isActive: {
    type: Boolean,
    required: true,
  },
});

function hasSimpleSpecifications(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((specificationValue) => {
    const valueType = typeof specificationValue;

    if (valueType === 'string' || valueType === 'boolean') {
      return true;
    }

    if (valueType === 'number') {
      return Number.isFinite(specificationValue);
    }

    return false;
  });
}

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
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

    images: {
      type: [productImageSchema],
      required: true,
      validate: [
        {
          validator(images) {
            return Array.isArray(images) && images.length > 0;
          },
          message: 'At least one product image is required.',
        },
        {
          validator(images) {
            return images.filter((image) => image.isPrimary).length <= 1;
          },
          message: 'Only one product image may be primary.',
        },
      ],
    },

    variants: {
      type: [productVariantSchema],
      default: () => [],
    },

    basePrice: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Base price must be an integer in paise.',
      },
    },

    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: null,
    },

    discountValue: {
      type: Number,
      default: null,
    },

    specifications: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
      validate: {
        validator: hasSimpleSpecifications,
        message: 'Specifications must contain simple key/value data.',
      },
    },

    isActive: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

productSchema.pre('validate', function validateDiscountConfiguration() {
  if (this.discountType === null) {
    if (this.discountValue !== null) {
      this.invalidate(
        'discountValue',
        'Discount value must be empty when no discount type is selected.',
      );
    }

    return;
  }

  if (!Number.isInteger(this.discountValue)) {
    this.invalidate('discountValue', 'Discount value must be an integer.');

    return;
  }

  if (this.discountType === 'percentage') {
    if (this.discountValue <= 0 || this.discountValue > 100) {
      this.invalidate(
        'discountValue',
        'Percentage discount must be between 1 and 100.',
      );
    }

    return;
  }

  if (this.discountType === 'fixed') {
    if (this.discountValue <= 0 || this.discountValue >= this.basePrice) {
      this.invalidate(
        'discountValue',
        'Fixed discount must be greater than zero and below the base price.',
      );
    }
  }
});

productSchema.index(
  {
    name: 'text',
    brand: 'text',
  },
  {
    weights: {
      name: 10,
      brand: 5,
    },
  },
);

productSchema.index({
  isActive: 1,
  sport: 1,
  createdAt: -1,
});

productSchema.index({
  isActive: 1,
  categoryId: 1,
  createdAt: -1,
});

productSchema.index({
  isActive: 1,
  createdAt: -1,
});

export const Product = mongoose.model('Product', productSchema);
