import { validateReviewCreateInput } from './review.validation.js';

import { createCustomerReview } from './review.service.js';

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
