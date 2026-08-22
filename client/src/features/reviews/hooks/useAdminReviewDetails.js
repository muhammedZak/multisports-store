import { useCallback, useEffect, useState } from 'react';

import {
  fetchAdminReview,
  moderateAdminReview,
} from '../../../api/reviewApi.js';

import { normalizeApiError } from '../../../api/errors.js';

export function useAdminReviewDetails(reviewId) {
  const [review, setReview] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [reason, setReason] = useState('');

  const [moderationLoading, setModerationLoading] = useState(false);

  const [moderationError, setModerationError] = useState(null);

  const [message, setMessage] = useState('');

  const loadReview = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const item = await fetchAdminReview(reviewId);

      setReview(item);
    } catch (requestError) {
      setReview(null);

      setError(
        normalizeApiError(
          requestError,

          'Unable to load this Review.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    loadReview();
  }, [loadReview]);

  function handleReasonChange(event) {
    setReason(event.target.value);

    setModerationError(null);

    setMessage('');
  }

  async function hideReview(event) {
    event.preventDefault();

    if (!review || moderationLoading) {
      return;
    }

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setModerationError({
        code: 'VALIDATION_ERROR',

        message: 'Enter a moderation reason before hiding this Review.',

        fields: {},
      });

      return;
    }

    const confirmed = window.confirm(
      'Hide this Review from the public storefront?',
    );

    if (!confirmed) {
      return;
    }

    setModerationLoading(true);

    setModerationError(null);

    setMessage('');

    try {
      const updated = await moderateAdminReview(
        review.id,

        {
          moderationStatus: 'hidden',

          reason: trimmedReason,
        },
      );

      setReview(updated);

      setReason('');

      setMessage('Review hidden successfully.');
    } catch (requestError) {
      setModerationError(
        normalizeApiError(
          requestError,

          'Unable to hide this Review.',
        ),
      );
    } finally {
      setModerationLoading(false);
    }
  }

  async function restoreReview() {
    if (!review || moderationLoading) {
      return;
    }

    const confirmed = window.confirm(
      'Restore this Review to the public storefront?',
    );

    if (!confirmed) {
      return;
    }

    setModerationLoading(true);

    setModerationError(null);

    setMessage('');

    try {
      const updated = await moderateAdminReview(
        review.id,

        {
          moderationStatus: 'visible',
        },
      );

      setReview(updated);

      setMessage('Review restored successfully.');
    } catch (requestError) {
      setModerationError(
        normalizeApiError(
          requestError,

          'Unable to restore this Review.',
        ),
      );
    } finally {
      setModerationLoading(false);
    }
  }

  return {
    review,

    loading,
    error,

    reason,

    moderationLoading,
    moderationError,

    message,

    loadReview,

    handleReasonChange,

    hideReview,
    restoreReview,
  };
}
