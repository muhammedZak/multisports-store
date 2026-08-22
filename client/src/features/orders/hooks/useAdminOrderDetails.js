import { useCallback, useEffect, useState } from 'react';

import {
  fetchAdminOrder,
  updateAdminOrderStatus,
} from '../../../api/orderApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import { formatOrderLabel } from '../order.utils.js';

export function useAdminOrderDetails(orderId) {
  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [statusUpdating, setStatusUpdating] = useState(null);

  const [actionError, setActionError] = useState(null);

  const [message, setMessage] = useState('');

  const loadOrder = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const item = await fetchAdminOrder(orderId);

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

  async function updateStatus(nextStatus) {
    if (
      !order ||
      statusUpdating ||
      !order.allowedNextStatuses.includes(nextStatus)
    ) {
      return;
    }

    if (nextStatus === 'cancelled') {
      const confirmed = window.confirm(
        `Cancel order ${order.orderNumber}? Inventory will be restored and this action cannot be undone.`,
      );

      if (!confirmed) {
        return;
      }
    }

    setStatusUpdating(nextStatus);

    setActionError(null);

    setMessage('');

    try {
      const updatedOrder = await updateAdminOrderStatus(
        order.id,

        nextStatus,
      );

      setOrder(updatedOrder);

      setMessage(
        nextStatus === 'cancelled'
          ? 'Order cancelled successfully.'
          : `Order status updated to ${formatOrderLabel(nextStatus)}.`,
      );
    } catch (requestError) {
      const normalizedError = normalizeApiError(
        requestError,

        'Unable to update this Order.',
      );

      setActionError(normalizedError);

      /*
       * Another Admin or process
       * may have transitioned the
       * Order since this page was
       * loaded.
       *
       * Backend remains authority.
       */
      if (normalizedError.code === 'INVALID_STATE_TRANSITION') {
        await loadOrder();
      }
    } finally {
      setStatusUpdating(null);
    }
  }

  return {
    order,

    loading,
    error,

    statusUpdating,

    actionError,
    message,

    loadOrder,

    updateStatus,
  };
}
