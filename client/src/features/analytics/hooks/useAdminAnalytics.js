import { useEffect, useState } from 'react';

import { useSearchParams } from 'react-router';

import { fetchAdminAnalytics } from '../../../api/analyticsApi.js';

import { normalizeApiError } from '../../../api/errors.js';

export function useAdminAnalytics() {
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedRange = searchParams.get('range') || '30d';

  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);

    setError(null);

    fetchAdminAnalytics(
      requestedRange,

      {
        signal: controller.signal,
      },
    )
      .then((data) => {
        if (controller.signal.aborted) {
          return;
        }

        setAnalytics(data);
      })
      .catch((requestError) => {
        if (
          controller.signal.aborted ||
          requestError?.code === 'ERR_CANCELED'
        ) {
          return;
        }

        setAnalytics(null);

        setError(
          normalizeApiError(
            requestError,

            'Unable to load Admin Analytics. Please try again.',
          ),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [requestedRange, reloadKey]);

  function changeRange(range) {
    setSearchParams({
      range,
    });
  }

  function retry() {
    setReloadKey((current) => current + 1);
  }

  return {
    analytics,

    requestedRange,

    loading,
    error,

    changeRange,
    retry,
  };
}
