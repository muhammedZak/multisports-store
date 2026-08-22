import { useCallback, useEffect, useState } from 'react';

import { fetchAdminCategories, fetchSports } from '../../../api/categoryApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import { fetchAdminProducts } from '../../../api/productApi.js';

import {
  ADMIN_PRODUCT_DEFAULT_META,
  ADMIN_PRODUCT_DEFAULT_QUERY,
  ADMIN_PRODUCT_EMPTY_FILTERS,
} from '../adminProduct.constants.js';

export function useAdminProducts() {
  const [products, setProducts] = useState([]);

  const [sports, setSports] = useState([]);

  const [categories, setCategories] = useState([]);

  const [filterForm, setFilterForm] = useState(ADMIN_PRODUCT_EMPTY_FILTERS);

  const [query, setQuery] = useState(ADMIN_PRODUCT_DEFAULT_QUERY);

  const [meta, setMeta] = useState(ADMIN_PRODUCT_DEFAULT_META);

  const [loading, setLoading] = useState(true);

  const [referencesLoading, setReferencesLoading] = useState(true);

  const [listError, setListError] = useState(null);

  const [referencesError, setReferencesError] = useState(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);

    setListError(null);

    try {
      const result = await fetchAdminProducts(query);

      setProducts(result.items);

      setMeta(result.meta);
    } catch (requestError) {
      setListError(
        normalizeApiError(
          requestError,
          'Unable to load products. Please try again.',
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
    loadProducts();
  }, [loadProducts]);

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

      if (name === 'sport') {
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

      brand: filterForm.brand.trim(),

      page: 1,
      limit: 20,
    });
  }

  function resetFilters() {
    setFilterForm(ADMIN_PRODUCT_EMPTY_FILTERS);

    setQuery(ADMIN_PRODUCT_DEFAULT_QUERY);
  }

  function changePage(page) {
    setQuery((current) => ({
      ...current,

      page,
    }));
  }

  return {
    products,

    sports,
    categories,
    visibleCategories,

    filterForm,

    query,
    meta,

    loading,
    referencesLoading,

    listError,
    referencesError,

    loadProducts,
    loadReferences,

    handleFilterChange,
    applyFilters,
    resetFilters,

    changePage,
  };
}
