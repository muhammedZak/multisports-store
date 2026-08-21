import { useCallback, useEffect, useState } from 'react';

import { cancelMyOrder, fetchMyOrder } from '../../../api/orderApi.js';

import { normalizeApiError } from '../../../api/errors.js';

export function useOrderDetails(orderId) {
  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [actionError, setActionError] = useState(null);

  const [message, setMessage] = useState('');

  const [cancelling, setCancelling] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const item = await fetchMyOrder(orderId);

      setOrder(item);
    } catch (requestError) {
      setOrder(null);

      setError(
        normalizeApiError(
          requestError,
          'Unable to load this order. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  async function cancelOrder() {
    if (!order || order.orderStatus !== 'placed' || cancelling) {
      return;
    }

    const confirmed = window.confirm(
      `Cancel order ${order.orderNumber}? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setCancelling(true);

    setActionError(null);

    setMessage('');

    try {
      const updatedOrder = await cancelMyOrder(order.id);

      setOrder(updatedOrder);

      setMessage('Order cancelled successfully.');
    } catch (requestError) {
      const normalizedError = normalizeApiError(
        requestError,
        'Unable to cancel this order. Please try again.',
      );

      setActionError(normalizedError);

      /*
       * Order state may have
       * changed since this page
       * was loaded.
       *
       * Reload backend authority.
       */
      if (normalizedError.code === 'ORDER_NOT_CANCELLABLE') {
        await loadOrder();
      }
    } finally {
      setCancelling(false);
    }
  }

  return {
    order,

    loading,
    error,

    actionError,
    message,

    cancelling,

    loadOrder,
    cancelOrder,
  };
}
