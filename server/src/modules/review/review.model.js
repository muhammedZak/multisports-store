import mongoose from 'mongoose';

export const REVIEW_MODERATION_STATUSES = Object.freeze({
  VISIBLE: 'visible',
  HIDDEN: 'hidden',
});

export const REVIEW_TEXT_MAX_LENGTH = 1000;

const reviewSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      immutable: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Review rating must be an integer from 1 to 5.',
      },
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: REVIEW_TEXT_MAX_LENGTH,
    },

    moderationStatus: {
      type: String,
      enum: Object.values(REVIEW_MODERATION_STATUSES),
      required: true,
      default: REVIEW_MODERATION_STATUSES.VISIBLE,
    },

    moderationReason: {
      type: String,
      trim: true,
      default: null,
    },

    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    moderatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

reviewSchema.index(
  {
    customerId: 1,
    productId: 1,
  },
  {
    unique: true,
    name: 'review_customer_product_unique',
  },
);

reviewSchema.index(
  {
    productId: 1,
    moderationStatus: 1,
    createdAt: -1,
  },
  {
    name: 'review_product_public_history',
  },
);

reviewSchema.index(
  {
    customerId: 1,
    createdAt: -1,
  },
  {
    name: 'review_customer_history',
  },
);

export const Review = mongoose.model('Review', reviewSchema);
