import { apiClient } from './client.js';

export async function fetchMyReviews({
  page = 1,
  limit = 20,
  productId,
  moderationStatus,
  sort = 'createdAt',
  order = 'desc',
} = {}) {
  const params = {
    page,
    limit,
    sort,
    order,
  };

  if (productId) {
    params.productId = productId;
  }

  if (moderationStatus) {
    params.moderationStatus = moderationStatus;
  }

  const response = await apiClient.get('/reviews/me', {
    params,
  });

  return {
    items: response.data.data.items,
    meta: response.data.meta,
  };
}

export async function updateMyReview(reviewId, changes) {
  const response = await apiClient.patch(`/reviews/${reviewId}`, changes);

  return response.data.data.review;
}

export async function deleteMyReview(reviewId) {
  await apiClient.delete(`/reviews/${reviewId}`);
}

export async function fetchPublicProductReviews(
  productId,
  { page = 1, limit = 10, rating, sort = 'createdAt', order = 'desc' } = {},
) {
  const params = {
    page,
    limit,
    sort,
    order,
  };

  if (rating) {
    params.rating = rating;
  }

  const response = await apiClient.get(`/products/${productId}/reviews`, {
    params,
  });

  return {
    items: response.data.data.items,
    ratingSummary: response.data.data.ratingSummary,
    meta: response.data.meta,
  };
}

export async function createProductReview(productId, payload) {
  const response = await apiClient.post(
    `/products/${productId}/reviews`,
    payload,
  );

  return response.data.data.review;
}