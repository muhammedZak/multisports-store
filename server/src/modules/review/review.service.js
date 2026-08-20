import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import { Product } from '../catalog/product.model.js';

import { Order, ORDER_STATUSES } from '../order/order.model.js';

import { Review, REVIEW_MODERATION_STATUSES } from './review.model.js';

function throwReviewNotFound() {
  throw new AppError(404, 'REVIEW_NOT_FOUND', 'Review not found.');
}

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

function getCustomerProductPrimaryImage(images = []) {
  const sortedImages = [...images].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );

  const image = sortedImages.find((item) => item.isPrimary) ?? sortedImages[0];

  if (!image) {
    return null;
  }

  return {
    url: image.url,
    altText: image.altText ?? '',
  };
}

function toCustomerReviewProduct(product) {
  if (!product?._id) {
    return null;
  }

  return {
    id: product._id.toString(),

    name: product.name,

    primaryImage: getCustomerProductPrimaryImage(product.images),

    isActive: product.isActive,
  };
}

function getReviewProductId(review) {
  const product = review.productId;

  if (!product) {
    return null;
  }

  return (product._id ?? product).toString();
}

function toCustomerReviewResource(review) {
  return {
    id: review._id.toString(),

    productId: getReviewProductId(review),

    product: toCustomerReviewProduct(review.productId),

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

async function ensurePublicProductExists(productId) {
  if (!mongoose.isValidObjectId(productId)) {
    throwProductNotFound();
  }

  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  })
    .select('sport categoryId')
    .populate('categoryId', 'sport isActive')
    .lean();

  if (
    !product ||
    !product.categoryId ||
    !product.categoryId.isActive ||
    product.categoryId.sport !== product.sport
  ) {
    throwProductNotFound();
  }
}

function toPublicReviewerResource(customer) {
  if (!customer) {
    return null;
  }

  return {
    name: customer.name,

    profilePhotoUrl: customer.profilePhoto?.url ?? null,
  };
}

function toPublicReviewResource(review) {
  return {
    id: review._id.toString(),

    rating: review.rating,

    text: review.text,

    reviewer: toPublicReviewerResource(review.customerId),

    createdAt: review.createdAt,

    updatedAt: review.updatedAt,
  };
}

function createEmptyRatingSummary() {
  return {
    averageRating: null,
    reviewCount: 0,
  };
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

export async function getVisibleReviewRatingSummaries(productIds) {
  const uniqueProductIds = [
    ...new Set(
      (productIds ?? [])
        .map((value) => value?._id ?? value)
        .filter((value) => mongoose.isValidObjectId(value))
        .map((value) => value.toString()),
    ),
  ];

  const summariesByProductId = new Map(
    uniqueProductIds.map((productId) => [
      productId,
      createEmptyRatingSummary(),
    ]),
  );

  if (uniqueProductIds.length === 0) {
    return summariesByProductId;
  }

  const aggregateRows = await Review.aggregate([
    {
      $match: {
        productId: {
          $in: uniqueProductIds.map(
            (productId) => new mongoose.Types.ObjectId(productId),
          ),
        },

        moderationStatus: REVIEW_MODERATION_STATUSES.VISIBLE,
      },
    },

    {
      $group: {
        _id: '$productId',

        reviewCount: {
          $sum: 1,
        },

        averageRating: {
          $avg: '$rating',
        },
      },
    },
  ]);

  for (const row of aggregateRows) {
    summariesByProductId.set(row._id.toString(), {
      averageRating: Math.round(Number(row.averageRating) * 10) / 10,

      reviewCount: row.reviewCount,
    });
  }

  return summariesByProductId;
}

export async function getVisibleReviewRatingSummary(productId) {
  const summaries = await getVisibleReviewRatingSummaries([productId]);

  return summaries.get(productId.toString()) ?? createEmptyRatingSummary();
}

export async function getPublicProductReviews({
  productId,
  page,
  limit,
  rating,
  sort,
  order,
}) {
  await ensurePublicProductExists(productId);

  const filter = {
    productId,

    moderationStatus: REVIEW_MODERATION_STATUSES.VISIBLE,
  };

  if (rating !== undefined) {
    filter.rating = rating;
  }

  const direction = order === 'asc' ? 1 : -1;

  const sortDefinition = {
    [sort]: direction,
    _id: direction,
  };

  const skip = (page - 1) * limit;

  const [reviews, totalItems, ratingSummary] = await Promise.all([
    Review.find(filter)
      .select('customerId rating text createdAt updatedAt')
      .populate('customerId', 'name profilePhoto')
      .sort(sortDefinition)
      .skip(skip)
      .limit(limit)
      .lean(),

    Review.countDocuments(filter),

    getVisibleReviewRatingSummary(productId),
  ]);

  return {
    items: reviews.map(toPublicReviewResource),

    ratingSummary,

    meta: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

export async function getCustomerReviews({
  customerId,
  page,
  limit,
  productId,
  moderationStatus,
  sort,
  order,
}) {
  const filter = {
    customerId,
  };

  if (productId) {
    filter.productId = productId;
  }

  if (moderationStatus) {
    filter.moderationStatus = moderationStatus;
  }

  const direction = order === 'asc' ? 1 : -1;

  const sortDefinition = {
    [sort]: direction,
    _id: direction,
  };

  const skip = (page - 1) * limit;

  const [reviews, totalItems] = await Promise.all([
    Review.find(filter)
      .select(
        [
          'productId',
          'rating',
          'text',
          'moderationStatus',
          'moderationReason',
          'createdAt',
          'updatedAt',
        ].join(' '),
      )
      .populate('productId', 'name images isActive')
      .sort(sortDefinition)
      .skip(skip)
      .limit(limit)
      .lean(),

    Review.countDocuments(filter),
  ]);

  return {
    items: reviews.map(toCustomerReviewResource),

    meta: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

export async function updateCustomerReview({ customerId, reviewId, changes }) {
  if (!mongoose.isValidObjectId(reviewId)) {
    throwReviewNotFound();
  }

  const review = await Review.findOne({
    _id: reviewId,
    customerId,
  });

  if (!review) {
    throwReviewNotFound();
  }

  if (Object.prototype.hasOwnProperty.call(changes, 'rating')) {
    review.rating = changes.rating;
  }

  if (Object.prototype.hasOwnProperty.call(changes, 'text')) {
    review.text = changes.text;
  }

  /*
   * Do not touch moderationStatus here.
   *
   * A hidden Review remains hidden even when
   * the Customer edits rating/text.
   */
  await review.save();

  await review.populate('productId', 'name images isActive');

  return toCustomerReviewResource(review);
}

export async function deleteCustomerReview({ customerId, reviewId }) {
  if (!mongoose.isValidObjectId(reviewId)) {
    throwReviewNotFound();
  }

  const deletedReview = await Review.findOneAndDelete({
    _id: reviewId,
    customerId,
  });

  if (!deletedReview) {
    throwReviewNotFound();
  }
}