import { useCallback, useEffect, useState } from 'react';

import { useNavigate } from 'react-router';

import { fetchMyOrder } from '../../../api/orderApi.js';

import { createRefundRequest } from '../../../api/refundApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import { isOrderRefundEligible } from '../../orders/order.utils.js';

export function useRefundRequest(orderId) {
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState(null);

  const [scope, setScope] = useState('order');

  const [selectedItemIds, setSelectedItemIds] = useState([]);

  const [reason, setReason] = useState('');

  const [explanation, setExplanation] = useState('');

  const [formError, setFormError] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);

    setLoadError(null);

    try {
      const item = await fetchMyOrder(orderId);

      setOrder(item);
    } catch (requestError) {
      setOrder(null);

      setLoadError(
        normalizeApiError(
          requestError,
          'Unable to load this Order. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  function handleScopeChange(event) {
    const nextScope = event.target.value;

    setScope(nextScope);

    setFormError(null);

    if (nextScope === 'order') {
      setSelectedItemIds([]);
    }
  }

  function toggleItem(itemId) {
    setSelectedItemIds((current) =>
      current.includes(itemId)
        ? current.filter((selectedId) => selectedId !== itemId)
        : [...current, itemId],
    );

    setFormError(null);
  }

  function reloadOrderData() {
    setSelectedItemIds([]);

    setFormError(null);

    loadOrder();
  }

  async function submit(event) {
    event.preventDefault();

    if (submitting || !order) {
      return;
    }

    const normalizedReason = reason.trim();

    const normalizedExplanation = explanation.trim();

    if (!normalizedReason) {
      setFormError({
        code: 'VALIDATION_ERROR',

        message: 'Enter a reason for your Refund request.',
      });

      return;
    }

    if (scope === 'items' && selectedItemIds.length === 0) {
      setFormError({
        code: 'REFUND_SCOPE_INVALID',

        message: 'Select at least one complete Order item line.',
      });

      return;
    }

    const payload = {
      scope,

      ...(scope === 'items'
        ? {
            orderItemIds: selectedItemIds,
          }
        : {}),

      reason: normalizedReason,

      ...(normalizedExplanation
        ? {
            explanation: normalizedExplanation,
          }
        : {}),
    };

    setSubmitting(true);

    setFormError(null);

    try {
      const refund = await createRefundRequest(order.id, payload);

      navigate(`/account/refunds/${refund.id}`, {
        state: {
          successMessage: 'Refund request submitted successfully.',
        },
      });
    } catch (requestError) {
      setFormError(
        normalizeApiError(
          requestError,
          'Unable to submit your Refund request. Please try again.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return {
    order,

    loading,
    loadError,

    refundEligible: isOrderRefundEligible(order),

    scope,
    selectedItemIds,

    reason,
    explanation,

    formError,

    submitting,

    setReason,
    setExplanation,

    loadOrder,

    handleScopeChange,
    toggleItem,

    reloadOrderData,

    submit,
  };
}
