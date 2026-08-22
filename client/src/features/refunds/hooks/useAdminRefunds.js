import { useCallback, useEffect, useState } from 'react';

import { fetchAdminRefunds } from '../../../api/refundApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import {
  ADMIN_REFUND_DEFAULT_META,
  ADMIN_REFUND_DEFAULT_QUERY,
  ADMIN_REFUND_EMPTY_FILTERS,
} from '../adminRefund.constants.js';

export function useAdminRefunds() {
  const [refunds, setRefunds] = useState([]);

  const [filterForm, setFilterForm] = useState(ADMIN_REFUND_EMPTY_FILTERS);

  const [query, setQuery] = useState(ADMIN_REFUND_DEFAULT_QUERY);

  const [meta, setMeta] = useState(ADMIN_REFUND_DEFAULT_META);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const loadRefunds = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const result = await fetchAdminRefunds(query);

      setRefunds(result.items);

      setMeta(result.meta);
    } catch (requestError) {
      /*
       * Preserve the current
       * Admin Refund-list
       * behavior.
       */
      setRefunds([]);

      setError(
        normalizeApiError(
          requestError,

          'Unable to load Refunds. Please try again.',
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
      ...filterForm,

      q: filterForm.q.trim(),

      customerId: filterForm.customerId.trim(),

      orderId: filterForm.orderId.trim(),

      page: 1,
      limit: 20,

      sort: 'requestedAt',
    });
  }

  function resetFilters() {
    setFilterForm(ADMIN_REFUND_EMPTY_FILTERS);

    setQuery(ADMIN_REFUND_DEFAULT_QUERY);
  }

  function changePage(page) {
    setQuery((current) => ({
      ...current,

      page,
    }));
  }

  const filtersActive = Boolean(
    query.q ||
    query.status ||
    query.origin ||
    query.customerId ||
    query.orderId ||
    query.dateFrom ||
    query.dateTo ||
    query.order !== 'desc',
  );

  return {
    refunds,

    filterForm,

    meta,

    loading,
    error,

    filtersActive,

    loadRefunds,

    handleFilterChange,
    applyFilters,
    resetFilters,

    changePage,
  };
}
