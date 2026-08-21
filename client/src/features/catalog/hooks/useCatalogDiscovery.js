import { useEffect, useState } from 'react';

import {
  fetchCatalogFilterOptions,
  fetchPublicProducts,
} from '../../../api/productApi.js';

import {
  fetchPublicCategories,
  fetchSports,
} from '../../../api/categoryApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import { DEFAULT_META, EMPTY_FILTER_OPTIONS } from '../catalog.constants.js';

export function useCatalogDiscovery(catalogQuery) {
  const [products, setProducts] = useState([]);

  const [meta, setMeta] = useState(DEFAULT_META);

  const [sports, setSports] = useState([]);

  const [categories, setCategories] = useState([]);

  const [filterOptions, setFilterOptions] = useState(EMPTY_FILTER_OPTIONS);

  const [loading, setLoading] = useState(true);

  const [referencesLoading, setReferencesLoading] = useState(true);

  const [listError, setListError] = useState(null);

  const [referencesError, setReferencesError] = useState(null);

  const [filterOptionsError, setFilterOptionsError] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadReferences() {
      setReferencesLoading(true);

      setReferencesError(null);

      try {
        const [sportItems, categoryItems] = await Promise.all([
          fetchSports(),
          fetchPublicCategories(),
        ]);

        if (cancelled) {
          return;
        }

        setSports(sportItems);

        setCategories(categoryItems);
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setReferencesError(
          normalizeApiError(requestError, 'Unable to load catalog references.'),
        );
      } finally {
        if (!cancelled) {
          setReferencesLoading(false);
        }
      }
    }

    loadReferences();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setLoading(true);

      setListError(null);

      setFilterOptionsError(null);

      const [productRequest, filterOptionsRequest] = await Promise.allSettled([
        fetchPublicProducts(catalogQuery),

        fetchCatalogFilterOptions({
          q: catalogQuery.q,

          sport: catalogQuery.sport,

          categoryId: catalogQuery.categoryId,
        }),
      ]);

      if (cancelled) {
        return;
      }

      if (productRequest.status === 'fulfilled') {
        setProducts(productRequest.value.items);

        setMeta(productRequest.value.meta);
      } else {
        setProducts([]);

        setMeta(DEFAULT_META);

        setListError(
          normalizeApiError(
            productRequest.reason,
            'Unable to load products. Please try again.',
          ),
        );
      }

      if (filterOptionsRequest.status === 'fulfilled') {
        setFilterOptions(filterOptionsRequest.value);
      } else {
        setFilterOptions(EMPTY_FILTER_OPTIONS);

        setFilterOptionsError(
          normalizeApiError(
            filterOptionsRequest.reason,
            'Unable to load filter options.',
          ),
        );
      }

      setLoading(false);
    }

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [catalogQuery, reloadKey]);

  function retryCatalog() {
    setReloadKey((current) => current + 1);
  }

  return {
    products,
    meta,

    sports,
    categories,
    filterOptions,

    loading,
    referencesLoading,

    listError,
    referencesError,
    filterOptionsError,

    retryCatalog,
  };
}
