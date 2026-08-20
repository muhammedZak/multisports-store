import {
  validatePublicReviewQuery,
  validateReviewCreateInput,
} from './review.validation.js';

import {
  createCustomerReview,
  getPublicProductReviews,
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
