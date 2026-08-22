import { useState } from 'react';

import {
  requestPasswordRecovery,
  verifyPasswordRecovery,
} from '../../../api/authApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import { OTP_RESEND_COOLDOWN_SECONDS } from '../auth.constants.js';

import { normalizeNumericOtp } from '../auth.utils.js';

import { useResendCooldown } from './useResendCooldown.js';

export function usePasswordRecovery({
  initialEmail = '',

  onAuthorized,
}) {
  const [step, setStep] = useState('request');

  const [email, setEmail] = useState(initialEmail);

  const [otp, setOtp] = useState('');

  const [message, setMessage] = useState('');

  const [error, setError] = useState(null);

  const [loading, setLoading] = useState(false);

  const [resending, setResending] = useState(false);

  const cooldown = useResendCooldown();

  function handleEmailChange(event) {
    setEmail(event.target.value);

    setError(null);
  }

  function handleOtpChange(event) {
    setOtp(normalizeNumericOtp(event.target.value));

    setError(null);
  }

  async function requestRecovery(event) {
    event.preventDefault();

    setLoading(true);

    setError(null);

    setMessage('');

    try {
      const result = await requestPasswordRecovery({
        email,
      });

      setMessage(result.message);

      setOtp('');

      cooldown.start(OTP_RESEND_COOLDOWN_SECONDS);

      setStep('verify');
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,

          'Unable to request a password reset code.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyRecovery(event) {
    event.preventDefault();

    setLoading(true);

    setError(null);

    try {
      const result = await verifyPasswordRecovery({
        email,
        otp,
      });

      if (result.resetAuthorized) {
        onAuthorized?.(email);
      }
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,

          'Unable to verify the recovery code.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function resendRecovery() {
    if (loading || resending || cooldown.active) {
      return;
    }

    setResending(true);

    setError(null);

    setMessage('');

    try {
      const result = await requestPasswordRecovery({
        email,
      });

      setMessage(result.message);

      setOtp('');

      cooldown.start(OTP_RESEND_COOLDOWN_SECONDS);
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,

          'Unable to request another recovery code.',
        ),
      );
    } finally {
      setResending(false);
    }
  }

  function changeEmail() {
    setStep('request');

    setOtp('');

    setMessage('');

    setError(null);

    cooldown.reset();
  }

  return {
    step,

    email,
    otp,

    message,
    error,

    loading,
    resending,

    resendSeconds: cooldown.seconds,

    handleEmailChange,
    handleOtpChange,

    requestRecovery,
    verifyRecovery,

    resendRecovery,
    changeEmail,
  };
}
