import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },

  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },

  quantity: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: Number.isInteger,
      message: 'Cart item quantity must be a positive integer.',
    },
  },
});

const cartSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    items: {
      type: [cartItemSchema],
      required: true,
      default: () => [],
    },

    appliedCouponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

cartSchema.index(
  {
    customerId: 1,
  },
  {
    unique: true,
    name: 'cart_customer_unique',
  },
);

export const Cart = mongoose.model('Cart', cartSchema);
