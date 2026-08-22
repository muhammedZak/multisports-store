import { useCallback, useEffect, useState } from 'react';

import { decideAdminRefund, fetchAdminRefund } from '../../../api/refundApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import { ADMIN_REFUND_RETRY_ORIGINS } from '../adminRefund.constants.js';

import { getAdminRefundProviderResultMessage } from '../adminRefund.utils.js';

export function useAdminRefundDetails(refundId) {
  const [refund, setRefund] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [approveNote, setApproveNote] = useState('');

  const [approveRestock, setApproveRestock] = useState('');

  const [rejectNote, setRejectNote] = useState('');

  const [decisionLoading, setDecisionLoading] = useState(false);

  const [decisionError, setDecisionError] = useState(null);

  const [message, setMessage] = useState('');

  const loadRefund = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const item = await fetchAdminRefund(refundId);

      setRefund(item);
    } catch (requestError) {
      setRefund(null);

      setError(
        normalizeApiError(
          requestError,

          'Unable to load this Refund.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [refundId]);

  useEffect(() => {
    loadRefund();
  }, [loadRefund]);

  function clearDecisionFeedback() {
    setDecisionError(null);

    setMessage('');
  }

  function handleApproveNoteChange(event) {
    setApproveNote(event.target.value);

    clearDecisionFeedback();
  }

  function handleApproveRestockChange(event) {
    setApproveRestock(event.target.value);

    clearDecisionFeedback();
  }

  function handleRejectNoteChange(event) {
    setRejectNote(event.target.value);

    clearDecisionFeedback();
  }

  async function refreshAfterStaleDecision(normalizedError) {
    try {
      const authoritativeRefund = await fetchAdminRefund(refund.id);

      setRefund(authoritativeRefund);

      setDecisionError({
        ...normalizedError,

        message:
          'This Refund was decided elsewhere. The authoritative status has been reloaded.',
      });
    } catch (refreshError) {
      setDecisionError(
        normalizeApiError(
          refreshError,

          'The Refund changed, but its current state could not be reloaded.',
        ),
      );
    }
  }

  async function refreshAfterProviderUncertainty(normalizedError) {
    try {
      const authoritativeRefund = await fetchAdminRefund(refund.id);

      setRefund(authoritativeRefund);

      if (authoritativeRefund.status === 'approved') {
        setDecisionError({
          ...normalizedError,

          message:
            'The durable Refund is saved, but provider processing is unconfirmed. Retry Provider Processing when ready.',
        });
      } else {
        setMessage(getAdminRefundProviderResultMessage(authoritativeRefund));
      }
    } catch (refreshError) {
      setDecisionError(
        normalizeApiError(
          refreshError,

          'Provider processing is unconfirmed, and the authoritative Refund state could not be reloaded.',
        ),
      );
    }
  }

  async function submitDecision(payload, successMessage) {
    if (!refund || decisionLoading) {
      return;
    }

    setDecisionLoading(true);

    setDecisionError(null);

    setMessage('');

    try {
      const updatedRefund = await decideAdminRefund(
        refund.id,

        payload,
      );

      setRefund(updatedRefund);

      setApproveNote('');

      setApproveRestock('');

      setRejectNote('');

      setMessage(
        typeof successMessage === 'function'
          ? successMessage(updatedRefund)
          : successMessage,
      );
    } catch (requestError) {
      const normalizedError = normalizeApiError(
        requestError,

        'Unable to record this Refund decision.',
      );

      if (normalizedError.code === 'REFUND_ALREADY_PROCESSED') {
        await refreshAfterStaleDecision(normalizedError);
      } else if (
        normalizedError.code === 'EXTERNAL_SERVICE_ERROR' &&
        payload.decision === 'approve'
      ) {
        await refreshAfterProviderUncertainty(normalizedError);
      } else {
        setDecisionError(normalizedError);
      }
    } finally {
      setDecisionLoading(false);
    }
  }

  async function approveRefund(event) {
    event.preventDefault();

    if (approveRestock !== 'yes' && approveRestock !== 'no') {
      setDecisionError({
        code: 'VALIDATION_ERROR',

        message: 'Choose whether Inventory should be restocked on completion.',

        fields: {},
      });

      return;
    }

    const confirmed = window.confirm(
      'Approve this Refund request with the selected restock decision?',
    );

    if (!confirmed) {
      return;
    }

    const normalizedNote = approveNote.trim();

    await submitDecision(
      {
        decision: 'approve',

        restockOnCompletion: approveRestock === 'yes',

        ...(normalizedNote
          ? {
              adminDecisionNote: normalizedNote,
            }
          : {}),
      },

      (updatedRefund) => getAdminRefundProviderResultMessage(updatedRefund),
    );
  }

  async function retryProviderProcessing() {
    const confirmed = window.confirm(
      'Retry reconciliation for this already-approved Refund?',
    );

    if (!confirmed) {
      return;
    }

    await submitDecision(
      {
        decision: 'approve',

        restockOnCompletion: refund.restockOnCompletion,

        ...(refund.origin === 'customer_request' && refund.adminDecisionNote
          ? {
              adminDecisionNote: refund.adminDecisionNote,
            }
          : {}),
      },

      (updatedRefund) => getAdminRefundProviderResultMessage(updatedRefund),
    );
  }

  async function rejectRefund(event) {
    event.preventDefault();

    const normalizedNote = rejectNote.trim();

    if (!normalizedNote) {
      setDecisionError({
        code: 'VALIDATION_ERROR',

        message: 'Enter a meaningful rejection note.',

        fields: {},
      });

      return;
    }

    const confirmed = window.confirm(
      'Reject this Refund request and release its claimed scope?',
    );

    if (!confirmed) {
      return;
    }

    await submitDecision(
      {
        decision: 'reject',

        adminDecisionNote: normalizedNote,
      },

      'Refund request rejected and its scope released.',
    );
  }

  const canDecide =
    refund?.status === 'requested' && refund?.origin === 'customer_request';

  const canRetryProvider =
    refund?.status === 'approved' &&
    ADMIN_REFUND_RETRY_ORIGINS.has(refund?.origin);

  const isSystemOrigin =
    refund?.origin === 'order_cancellation' ||
    refund?.origin === 'system_compensation';

  return {
    refund,

    loading,
    error,

    approveNote,
    approveRestock,
    rejectNote,

    decisionLoading,
    decisionError,

    message,

    canDecide,
    canRetryProvider,
    isSystemOrigin,

    loadRefund,

    handleApproveNoteChange,
    handleApproveRestockChange,
    handleRejectNoteChange,

    approveRefund,
    rejectRefund,

    retryProviderProcessing,
  };
}
