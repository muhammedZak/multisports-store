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
