import { useCallback, useEffect, useState } from 'react';

import { fetchPublicProduct } from '../../../api/productApi.js';

import { normalizeApiError } from '../../../api/errors.js';

export function useProductDetails(productId) {
  const [product, setProduct] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setLoading(true);

      setError(null);

      try {
        const item = await fetchPublicProduct(productId);

        if (cancelled) {
          return;
        }

        setProduct(item);
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setProduct(null);

        setError(
          normalizeApiError(
            requestError,
            'Unable to load this product. Please try again.',
          ),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [productId, reloadKey]);

  const retry = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  const updateRatingSummary = useCallback((ratingSummary) => {
    setProduct((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,

        averageRating: ratingSummary.averageRating,

        reviewCount: ratingSummary.reviewCount,
      };
    });
  }, []);

  return {
    product,
    loading,
    error,

    retry,
    updateRatingSummary,
  };
}
