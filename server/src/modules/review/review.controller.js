import {
  validateMyReviewQuery,
  validatePublicReviewQuery,
  validateReviewCreateInput,
  validateReviewUpdateInput,
} from './review.validation.js';

import {
  createCustomerReview,
  deleteCustomerReview,
  getCustomerReviews,
  getPublicProductReviews,
  updateCustomerReview,
} from './review.service.js';

export async function createReviewForCustomer(req, res) {
  const input = validateReviewCreateInput(req.body);

  const review = await createCustomerReview({
    customerId: req.user.id,

    productId: req.params.productId,

    rating: input.rating,

    text: input.text,
  });

  res.status(201).json({
    success: true,

    data: {
      review,
    },
  });
}

export async function getReviewsForPublic(req, res) {
  const query = validatePublicReviewQuery(req.query);

  const result = await getPublicProductReviews({
    productId: req.params.productId,

    ...query,
  });

  res.status(200).json({
    success: true,

    data: {
      items: result.items,

      ratingSummary: result.ratingSummary,
    },

    meta: result.meta,
  });
}

export async function getReviewsForCustomer(req, res) {
  const query = validateMyReviewQuery(req.query);

  const result = await getCustomerReviews({
    customerId: req.user.id,
    ...query,
  });

  res.status(200).json({
    success: true,

    data: {
      items: result.items,
    },

    meta: result.meta,
  });
}

export async function updateReviewForCustomer(req, res) {
  const changes = validateReviewUpdateInput(req.body);

  const review = await updateCustomerReview({
    customerId: req.user.id,
    reviewId: req.params.reviewId,
    changes,
  });

  res.status(200).json({
    success: true,

    data: {
      review,
    },
  });
}

export async function deleteReviewForCustomer(req, res) {
  await deleteCustomerReview({
    customerId: req.user.id,
    reviewId: req.params.reviewId,
  });

  res.status(204).send();
}