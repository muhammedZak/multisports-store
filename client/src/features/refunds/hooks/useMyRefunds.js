import { useCallback, useEffect, useState } from 'react';

import { fetchMyRefunds } from '../../../api/refundApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import {
  REFUND_DEFAULT_META,
  REFUND_DEFAULT_QUERY,
  REFUND_EMPTY_FILTERS,
} from '../refund.constants.js';

export function useMyRefunds() {
  const [refunds, setRefunds] = useState([]);

  const [filterForm, setFilterForm] = useState(REFUND_EMPTY_FILTERS);

  const [query, setQuery] = useState(REFUND_DEFAULT_QUERY);

  const [meta, setMeta] = useState(REFUND_DEFAULT_META);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const loadRefunds = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const result = await fetchMyRefunds(query);

      setRefunds(result.items);

      setMeta(result.meta);
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          'Unable to load your Refunds. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

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
      ...REFUND_DEFAULT_QUERY,
      ...filterForm,
      page: 1,
    });
  }

  function resetFilters() {
    setFilterForm(REFUND_EMPTY_FILTERS);

    setQuery(REFUND_DEFAULT_QUERY);
  }

  function changePage(page) {
    setQuery((current) => ({
      ...current,
      page,
    }));
  }

  return {
    refunds,

    filterForm,
    query,
    meta,

    loading,
    error,

    filtersActive: Boolean(query.status || query.origin),

    loadRefunds,

    handleFilterChange,

    applyFilters,
    resetFilters,
    changePage,
  };
}
