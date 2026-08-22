import { useCallback, useEffect, useState } from 'react';

import { fetchAdminReviews } from '../../../api/reviewApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import {
  ADMIN_REVIEW_DEFAULT_META,
  ADMIN_REVIEW_DEFAULT_QUERY,
  ADMIN_REVIEW_EMPTY_FILTERS,
} from '../adminReview.constants.js';

export function useAdminReviews() {
  const [reviews, setReviews] = useState([]);

  const [filterForm, setFilterForm] = useState(ADMIN_REVIEW_EMPTY_FILTERS);

  const [query, setQuery] = useState(ADMIN_REVIEW_DEFAULT_QUERY);

  const [meta, setMeta] = useState(ADMIN_REVIEW_DEFAULT_META);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const result = await fetchAdminReviews(query);

      setReviews(result.items);

      setMeta(result.meta);
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,

          'Unable to load Reviews. Please try again.',
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
      ...filterForm,

      productId: filterForm.productId.trim(),

      customerId: filterForm.customerId.trim(),

      page: 1,
      limit: 20,
    });
  }

  function resetFilters() {
    setFilterForm(ADMIN_REVIEW_EMPTY_FILTERS);

    setQuery(ADMIN_REVIEW_DEFAULT_QUERY);
  }

  function changePage(page) {
    setQuery((current) => ({
      ...current,

      page,
    }));
  }

  const filtersActive = Boolean(
    query.productId ||
    query.customerId ||
    query.rating ||
    query.moderationStatus ||
    query.sort !== 'createdAt' ||
    query.order !== 'desc',
  );

  return {
    reviews,

    filterForm,

    meta,

    loading,
    error,

    filtersActive,

    loadReviews,

    handleFilterChange,
    applyFilters,
    resetFilters,

    changePage,
  };
}
