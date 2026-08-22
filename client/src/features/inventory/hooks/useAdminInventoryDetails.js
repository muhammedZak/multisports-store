import { useCallback, useEffect, useState } from 'react';

import { normalizeApiError } from '../../../api/errors.js';

import {
  createAdminInventoryAdjustment,
  fetchAdminInventory,
  fetchAdminInventoryAdjustments,
} from '../../../api/inventoryApi.js';

import {
  INVENTORY_DEFAULT_HISTORY_QUERY,
  INVENTORY_DEFAULT_META,
  INVENTORY_EMPTY_ADJUSTMENT_FORM,
  INVENTORY_EMPTY_HISTORY_FILTERS,
} from '../inventory.constants.js';

import { validateInventoryAdjustment } from '../inventory.utils.js';

export function useAdminInventoryDetails(inventoryId) {
  const [inventory, setInventory] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [adjustmentForm, setAdjustmentForm] = useState(
    INVENTORY_EMPTY_ADJUSTMENT_FORM,
  );

  const [adjustmentSubmitting, setAdjustmentSubmitting] = useState(false);

  const [adjustmentError, setAdjustmentError] = useState(null);

  const [successMessage, setSuccessMessage] = useState('');

  const [adjustments, setAdjustments] = useState([]);

  const [historyFilterForm, setHistoryFilterForm] = useState(
    INVENTORY_EMPTY_HISTORY_FILTERS,
  );

  const [historyQuery, setHistoryQuery] = useState(
    INVENTORY_DEFAULT_HISTORY_QUERY,
  );

  const [historyMeta, setHistoryMeta] = useState(INVENTORY_DEFAULT_META);

  const [historyLoading, setHistoryLoading] = useState(true);

  const [historyError, setHistoryError] = useState(null);

  const loadInventory = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const item = await fetchAdminInventory(inventoryId);

      setInventory(item);
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          'Unable to load this inventory position.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [inventoryId]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);

    setHistoryError(null);

    try {
      const result = await fetchAdminInventoryAdjustments(
        inventoryId,

        historyQuery,
      );

      setAdjustments(result.items);

      setHistoryMeta(result.meta);
    } catch (requestError) {
      setHistoryError(
        normalizeApiError(requestError, 'Unable to load adjustment history.'),
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [inventoryId, historyQuery]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function refreshAuthoritativeState() {
    setError(null);

    setHistoryError(null);

    const [inventoryResult, historyResult] = await Promise.allSettled([
      fetchAdminInventory(inventoryId),

      fetchAdminInventoryAdjustments(
        inventoryId,

        historyQuery,
      ),
    ]);

    if (inventoryResult.status === 'fulfilled') {
      setInventory(inventoryResult.value);
    } else {
      setError(
        normalizeApiError(
          inventoryResult.reason,

          'Stock changed, but the latest inventory state could not be refreshed.',
        ),
      );
    }

    if (historyResult.status === 'fulfilled') {
      setAdjustments(historyResult.value.items);

      setHistoryMeta(historyResult.value.meta);
    } else {
      setHistoryError(
        normalizeApiError(
          historyResult.reason,

          'Unable to refresh adjustment history.',
        ),
      );
    }
  }

  function handleAdjustmentChange(event) {
    const { name, value } = event.target;

    setAdjustmentForm((current) => ({
      ...current,

      [name]: value,
    }));

    setAdjustmentError(null);

    setSuccessMessage('');
  }

  async function submitAdjustment(event) {
    event.preventDefault();

    setAdjustmentError(null);

    setSuccessMessage('');

    const validation = validateInventoryAdjustment(adjustmentForm);

    if (!validation.valid) {
      setAdjustmentError({
        code: 'CLIENT_VALIDATION',

        message: 'Please correct the invalid fields.',

        fields: validation.fields,
      });

      return;
    }

    setAdjustmentSubmitting(true);

    try {
      await createAdminInventoryAdjustment(
        inventoryId,

        validation.payload,
      );

      setSuccessMessage('Inventory adjusted successfully.');

      setAdjustmentForm(INVENTORY_EMPTY_ADJUSTMENT_FORM);

      await refreshAuthoritativeState();
    } catch (requestError) {
      const normalizedError = normalizeApiError(
        requestError,
        'Unable to adjust inventory.',
      );

      setAdjustmentError(normalizedError);

      if (normalizedError.code === 'INVENTORY_QUANTITY_CONFLICT') {
        await refreshAuthoritativeState();
      }
    } finally {
      setAdjustmentSubmitting(false);
    }
  }

  function handleHistoryFilterChange(event) {
    const { name, value } = event.target;

    setHistoryFilterForm((current) => ({
      ...current,

      [name]: value,
    }));
  }

  function applyHistoryFilters(event) {
    event.preventDefault();

    setHistoryQuery({
      ...historyFilterForm,

      sort: 'createdAt',

      page: 1,
      limit: 20,
    });
  }

  function resetHistoryFilters() {
    setHistoryFilterForm(INVENTORY_EMPTY_HISTORY_FILTERS);

    setHistoryQuery(INVENTORY_DEFAULT_HISTORY_QUERY);
  }

  function changeHistoryPage(page) {
    setHistoryQuery((current) => ({
      ...current,

      page,
    }));
  }

  return {
    inventory,

    loading,
    error,

    adjustmentForm,

    adjustmentSubmitting,
    adjustmentError,

    successMessage,

    adjustments,

    historyFilterForm,
    historyQuery,

    historyMeta,

    historyLoading,
    historyError,

    loadInventory,
    loadHistory,

    handleAdjustmentChange,
    submitAdjustment,

    handleHistoryFilterChange,
    applyHistoryFilters,
    resetHistoryFilters,

    changeHistoryPage,
  };
}
