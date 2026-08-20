import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import { Product } from '../catalog/product.model.js';

import { Order, ORDER_STATUSES } from '../order/order.model.js';

import { Review, REVIEW_MODERATION_STATUSES } from './review.model.js';

function throwProductNotFound() {
  throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
}

function throwReviewNotEligible() {
  throw new AppError(
    409,
    'REVIEW_NOT_ELIGIBLE',
    'You can review this Product only after a qualifying purchase.',
  );
}

function throwDuplicateReview() {
  throw new AppError(
    409,
    'DUPLICATE_REVIEW',
    'You have already reviewed this Product.',
  );
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

function toCustomerReviewResource(review) {
  return {
    id: review._id.toString(),

    productId: review.productId.toString(),

    rating: review.rating,

    text: review.text,

    moderationStatus: review.moderationStatus,

    moderationReason: review.moderationReason ?? null,

    createdAt: review.createdAt,

    updatedAt: review.updatedAt,
  };
}

async function ensureProductExists(productId) {
  if (!mongoose.isValidObjectId(productId)) {
    throwProductNotFound();
  }

  const productExists = await Product.exists({
    _id: productId,
  });

  if (!productExists) {
    throwProductNotFound();
  }
}

async function ensureReviewDoesNotExist({ customerId, productId }) {
  const existingReview = await Review.exists({
    customerId,
    productId,
  });

  if (existingReview) {
    throwDuplicateReview();
  }
}

async function ensureCustomerPurchasedProduct({ customerId, productId }) {
  const qualifyingOrderExists = await Order.exists({
    customerId,

    orderStatus: {
      $ne: ORDER_STATUSES.CANCELLED,
    },

    'items.productId': productId,
  });

  if (!qualifyingOrderExists) {
    throwReviewNotEligible();
  }
}

export async function createCustomerReview({
  customerId,
  productId,
  rating,
  text,
}) {
  await ensureProductExists(productId);

  await ensureReviewDoesNotExist({
    customerId,
    productId,
  });

  await ensureCustomerPurchasedProduct({
    customerId,
    productId,
  });

  try {
    const review = await Review.create({
      customerId,

      productId,

      rating,

      text,

      moderationStatus: REVIEW_MODERATION_STATUSES.VISIBLE,
    });

    return toCustomerReviewResource(review);
  } catch (error) {
    /*
     * The pre-check gives the normal request a clean error.
     *
     * The database unique index is still the final authority if
     * two create requests race at the same time.
     */
    if (isDuplicateKeyError(error)) {
      throwDuplicateReview();
    }

    throw error;
  }
}
