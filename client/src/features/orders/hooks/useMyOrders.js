import { useCallback, useEffect, useState } from 'react';

import { fetchMyOrders } from '../../../api/orderApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import {
  ORDER_DEFAULT_META,
  ORDER_DEFAULT_QUERY,
  ORDER_EMPTY_FILTERS,
} from '../order.constants.js';

export function useMyOrders() {
  const [orders, setOrders] = useState([]);

  const [filterForm, setFilterForm] = useState(ORDER_EMPTY_FILTERS);

  const [query, setQuery] = useState(ORDER_DEFAULT_QUERY);

  const [meta, setMeta] = useState(ORDER_DEFAULT_META);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const result = await fetchMyOrders(query);

      setOrders(result.items);

      setMeta(result.meta);
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          'Unable to load your orders. Please try again.',
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
      ...ORDER_DEFAULT_QUERY,
      ...filterForm,
      page: 1,
    });
  }

  function resetFilters() {
    setFilterForm(ORDER_EMPTY_FILTERS);

    setQuery(ORDER_DEFAULT_QUERY);
  }

  function changePage(page) {
    setQuery((current) => ({
      ...current,
      page,
    }));
  }

  return {
    orders,

    filterForm,
    query,
    meta,

    loading,
    error,

    filtersActive: Boolean(query.status),

    loadOrders,

    handleFilterChange,

    applyFilters,
    resetFilters,

    changePage,
  };
}
