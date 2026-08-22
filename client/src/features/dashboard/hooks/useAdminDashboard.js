import { useCallback, useEffect, useState } from 'react';

import { fetchAdminDashboard } from '../../../api/dashboardApi.js';

import { normalizeApiError } from '../../../api/errors.js';

export function useAdminDashboard() {
  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const data = await fetchAdminDashboard();

      setDashboard(data);
    } catch (requestError) {
      setDashboard(null);

      setError(
        normalizeApiError(
          requestError,

          'Unable to load the Admin Dashboard. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return {
    dashboard,

    loading,
    error,

    loadDashboard,
  };
}
