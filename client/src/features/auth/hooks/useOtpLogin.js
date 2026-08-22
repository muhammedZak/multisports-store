import { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import {
  clearAuthError,
  requestOtpLogin,
  verifyOtpLogin,
} from '../authSlice.js';

import { OTP_RESEND_COOLDOWN_SECONDS } from '../auth.constants.js';

import { useResendCooldown } from './useResendCooldown.js';

export function useOtpLogin({
  initialEmail = '',

  onAuthenticated,
}) {
  const dispatch = useDispatch();

  const { actionStatus, error, googleLinkPending } = useSelector(
    (state) => state.auth,
  );

  const [step, setStep] = useState('request');

  const [email, setEmail] = useState(initialEmail);

  const [otp, setOtp] = useState('');

  const [message, setMessage] = useState('');

  const [resending, setResending] = useState(false);

  const cooldown = useResendCooldown();

  const loading = actionStatus === 'loading';

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  function clearError() {
    if (error) {
      dispatch(clearAuthError());
    }
  }

  function handleEmailChange(event) {
    setEmail(event.target.value);

    clearError();
  }

  function handleOtpChange(event) {
    /*
     * Preserve existing Login OTP
     * behavior: the browser limits
     * length, while backend
     * validation remains
     * authoritative.
     */
    setOtp(event.target.value);

    clearError();
  }

  async function requestOtp(event) {
    event.preventDefault();

    const result = await dispatch(
      requestOtpLogin({
        email,
      }),
    );

    if (requestOtpLogin.fulfilled.match(result)) {
      setMessage(result.payload.message);

      cooldown.start(OTP_RESEND_COOLDOWN_SECONDS);

      setStep('verify');
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();

    const result = await dispatch(
      verifyOtpLogin({
        email,
        otp,
      }),
    );

    if (verifyOtpLogin.fulfilled.match(result)) {
      onAuthenticated?.(result.payload);
    }
  }

  async function resendOtp() {
    if (loading || resending || cooldown.active) {
      return;
    }

    dispatch(clearAuthError());

    setResending(true);

    try {
      const result = await dispatch(
        requestOtpLogin({
          email,
        }),
      );

      if (requestOtpLogin.fulfilled.match(result)) {
        setMessage(result.payload.message);

        setOtp('');

        cooldown.start(OTP_RESEND_COOLDOWN_SECONDS);
      }
    } finally {
      setResending(false);
    }
  }

  function changeEmail() {
    setStep('request');

    setOtp('');

    setMessage('');

    cooldown.reset();

    dispatch(clearAuthError());
  }

  return {
    step,

    email,
    otp,

    message,

    loading,
    resending,

    error,
    googleLinkPending,

    resendSeconds: cooldown.seconds,

    handleEmailChange,
    handleOtpChange,

    requestOtp,
    verifyOtp,

    resendOtp,
    changeEmail,
  };
}
