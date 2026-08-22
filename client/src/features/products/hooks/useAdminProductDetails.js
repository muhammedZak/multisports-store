import { useCallback, useEffect, useState } from 'react';

import {
  fetchAdminProduct,
  updateAdminProductStatus,
} from '../../../api/productApi.js';

import { normalizeApiError } from '../../../api/errors.js';

export function useAdminProductDetails({
  productId,

  initialMessage = '',
}) {
  const [product, setProduct] = useState(null);

  const [loading, setLoading] = useState(true);

  const [statusUpdating, setStatusUpdating] = useState(false);

  const [error, setError] = useState(null);

  const [message, setMessage] = useState(initialMessage);

  const loadProduct = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const item = await fetchAdminProduct(productId);

      setProduct(item);
    } catch (requestError) {
      setError(normalizeApiError(requestError, 'Unable to load this product.'));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  async function changeStatus() {
    if (!product || statusUpdating) {
      return;
    }

    const nextIsActive = !product.isActive;

    if (!nextIsActive) {
      const confirmed = window.confirm(`Deactivate "${product.name}"?`);

      if (!confirmed) {
        return;
      }
    }

    setStatusUpdating(true);

    setError(null);

    setMessage('');

    try {
      const updated = await updateAdminProductStatus(
        product.id,

        nextIsActive,
      );

      setProduct(updated);

      setMessage(
        nextIsActive
          ? 'Product activated successfully.'
          : 'Product deactivated successfully.',
      );
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,

          nextIsActive
            ? 'Unable to activate this product.'
            : 'Unable to deactivate this product.',
        ),
      );
    } finally {
      setStatusUpdating(false);
    }
  }

  return {
    product,

    loading,

    statusUpdating,

    error,
    message,

    loadProduct,
    changeStatus,
  };
}
