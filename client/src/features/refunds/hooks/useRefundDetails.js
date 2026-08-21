import { useCallback, useEffect, useState } from 'react';

import { fetchMyRefund } from '../../../api/refundApi.js';

import { normalizeApiError } from '../../../api/errors.js';

export function useRefundDetails(refundId) {
  const [refund, setRefund] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const loadRefund = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const item = await fetchMyRefund(refundId);

      setRefund(item);
    } catch (requestError) {
      setRefund(null);

      setError(
        normalizeApiError(
          requestError,
          'Unable to load this Refund. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [refundId]);

  useEffect(() => {
    loadRefund();
  }, [loadRefund]);

  return {
    refund,

    loading,
    error,

    loadRefund,
  };
}
