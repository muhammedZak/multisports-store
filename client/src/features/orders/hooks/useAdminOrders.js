import { useCallback, useEffect, useState } from 'react';

import { fetchAdminOrders } from '../../../api/orderApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import {
  ADMIN_ORDER_DEFAULT_META,
  ADMIN_ORDER_DEFAULT_QUERY,
  ADMIN_ORDER_EMPTY_FILTERS,
} from '../adminOrder.constants.js';

export function useAdminOrders() {
  const [orders, setOrders] = useState([]);

  const [filterForm, setFilterForm] = useState(ADMIN_ORDER_EMPTY_FILTERS);

  const [query, setQuery] = useState(ADMIN_ORDER_DEFAULT_QUERY);

  const [meta, setMeta] = useState(ADMIN_ORDER_DEFAULT_META);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const result = await fetchAdminOrders(query);

      setOrders(result.items);

      setMeta(result.meta);
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,

          'Unable to load orders. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

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

      sort: 'placedAt',

      page: 1,
      limit: 20,
    });
  }

  function resetFilters() {
    setFilterForm(ADMIN_ORDER_EMPTY_FILTERS);

    setQuery(ADMIN_ORDER_DEFAULT_QUERY);
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
    query.customerId ||
    query.dateFrom ||
    query.dateTo ||
    query.order !== 'desc',
  );

  return {
    orders,

    filterForm,

    query,
    meta,

    loading,
    error,

    filtersActive,

    loadOrders,

    handleFilterChange,

    applyFilters,
    resetFilters,

    changePage,
  };
}
