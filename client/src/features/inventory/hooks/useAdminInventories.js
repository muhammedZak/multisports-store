import { useCallback, useEffect, useState } from 'react';

import { fetchAdminCategories, fetchSports } from '../../../api/categoryApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import { fetchAdminInventories } from '../../../api/inventoryApi.js';

import {
  INVENTORY_DEFAULT_META,
  INVENTORY_DEFAULT_QUERY,
  INVENTORY_EMPTY_FILTERS,
} from '../inventory.constants.js';

export function useAdminInventories() {
  const [inventories, setInventories] = useState([]);

  const [sports, setSports] = useState([]);

  const [categories, setCategories] = useState([]);

  const [filterForm, setFilterForm] = useState(INVENTORY_EMPTY_FILTERS);

  const [query, setQuery] = useState(INVENTORY_DEFAULT_QUERY);

  const [meta, setMeta] = useState(INVENTORY_DEFAULT_META);

  const [loading, setLoading] = useState(true);

  const [referencesLoading, setReferencesLoading] = useState(true);

  const [listError, setListError] = useState(null);

  const [referencesError, setReferencesError] = useState(null);

  const loadInventories = useCallback(async () => {
    setLoading(true);

    setListError(null);

    try {
      const result = await fetchAdminInventories(query);

      setInventories(result.items);

      setMeta(result.meta);
    } catch (requestError) {
      setListError(
        normalizeApiError(
          requestError,
          'Unable to load inventory. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadReferences = useCallback(async () => {
    setReferencesLoading(true);

    setReferencesError(null);

    try {
      const [sportItems, categoryItems] = await Promise.all([
        fetchSports(),

        fetchAdminCategories(),
      ]);

      setSports(sportItems);

      setCategories(categoryItems);
    } catch (requestError) {
      setReferencesError(
        normalizeApiError(requestError, 'Unable to load catalog references.'),
      );
    } finally {
      setReferencesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventories();
  }, [loadInventories]);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  const visibleCategories = filterForm.sport
    ? categories.filter((category) => category.sport === filterForm.sport)
    : categories;

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilterForm((current) => {
      const next = {
        ...current,

        [name]: value,
      };

      if (name === 'sport' && value) {
        const selectedCategory = categories.find(
          (category) => category.id === current.categoryId,
        );

        if (selectedCategory && selectedCategory.sport !== value) {
          next.categoryId = '';
        }
      }

      return next;
    });
  }

  function applyFilters(event) {
    event.preventDefault();

    setQuery({
      ...filterForm,

      q: filterForm.q.trim(),

      page: 1,
      limit: 20,
    });
  }

  function resetFilters() {
    setFilterForm(INVENTORY_EMPTY_FILTERS);

    setQuery(INVENTORY_DEFAULT_QUERY);
  }

  function changePage(page) {
    setQuery((current) => ({
      ...current,

      page,
    }));
  }

  return {
    inventories,

    sports,

    visibleCategories,

    filterForm,

    meta,

    loading,
    referencesLoading,

    listError,
    referencesError,

    loadInventories,

    handleFilterChange,
    applyFilters,
    resetFilters,

    changePage,
  };
}
