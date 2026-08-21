import { useCallback, useEffect, useState } from 'react';

import {
  deleteMyReview,
  fetchMyReviews,
  updateMyReview,
} from '../../../api/reviewApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import {
  REVIEW_DEFAULT_META,
  REVIEW_DEFAULT_QUERY,
  REVIEW_EMPTY_FILTERS,
} from '../review.constants.js';

export function useMyReviews() {
  const [reviews, setReviews] = useState([]);

  const [filterForm, setFilterForm] = useState(REVIEW_EMPTY_FILTERS);

  const [query, setQuery] = useState(REVIEW_DEFAULT_QUERY);

  const [meta, setMeta] = useState(REVIEW_DEFAULT_META);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [editingReviewId, setEditingReviewId] = useState(null);

  const [editForm, setEditForm] = useState({
    rating: 5,
    text: '',
  });

  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [actionError, setActionError] = useState(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const result = await fetchMyReviews(query);

      setReviews(result.items);

      setMeta(result.meta);
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          'Unable to load your reviews. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilterForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function applyFilters(event) {
    event.preventDefault();

    setQuery({
      ...REVIEW_DEFAULT_QUERY,
      ...filterForm,
      page: 1,
    });
  }

  function resetFilters() {
    setFilterForm(REVIEW_EMPTY_FILTERS);

    setQuery(REVIEW_DEFAULT_QUERY);
  }

  function changePage(page) {
    setQuery((current) => ({
      ...current,
      page,
    }));
  }

  function startEditing(review) {
    setActionError(null);

    setEditingReviewId(review.id);

    setEditForm({
      rating: review.rating,
      text: review.text,
    });
  }

  function cancelEditing() {
    setEditingReviewId(null);

    setEditForm({
      rating: 5,
      text: '',
    });

    setActionError(null);
  }

  function handleEditChange(event) {
    const { name, value } = event.target;

    setEditForm((current) => ({
      ...current,

      [name]: name === 'rating' ? Number(value) : value,
    }));
  }

  async function saveReview(reviewId) {
    setActionLoadingId(reviewId);

    setActionError(null);

    try {
      const updatedReview = await updateMyReview(reviewId, editForm);

      setReviews((current) =>
        current.map((review) =>
          review.id === reviewId ? updatedReview : review,
        ),
      );

      setEditingReviewId(null);
    } catch (requestError) {
      setActionError(
        normalizeApiError(
          requestError,
          'Unable to update your review. Please try again.',
        ),
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  async function deleteReview(review) {
    const confirmed = window.confirm('Delete this review permanently?');

    if (!confirmed) {
      return;
    }

    setActionLoadingId(review.id);

    setActionError(null);

    try {
      await deleteMyReview(review.id);

      /*
       * Preserve the existing
       * pagination behavior.
       */
      if (reviews.length === 1 && meta.page > 1) {
        setQuery((current) => ({
          ...current,
          page: current.page - 1,
        }));

        return;
      }

      await loadReviews();
    } catch (requestError) {
      setActionError(
        normalizeApiError(
          requestError,
          'Unable to delete your review. Please try again.',
        ),
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  return {
    reviews,

    filterForm,
    query,
    meta,

    loading,
    error,

    editingReviewId,
    editForm,

    actionLoadingId,
    actionError,

    filtersActive: Boolean(query.moderationStatus),

    loadReviews,

    handleFilterChange,

    applyFilters,
    resetFilters,
    changePage,

    startEditing,
    cancelEditing,

    handleEditChange,

    saveReview,
    deleteReview,
  };
}
