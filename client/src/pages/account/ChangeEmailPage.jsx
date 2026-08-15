import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';

import { requestEmailChange, verifyEmailChange } from '../../api/authApi.js';

import { normalizeApiError } from '../../api/errors.js';

import {
  logout,
  updateAuthenticatedUserEmail,
} from '../../features/auth/authSlice.js';

const EMAIL_CHANGE_RESEND_COOLDOWN_SECONDS = 60;

function ChangeEmailPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user = useSelector((state) => state.auth.user);

  const [step, setStep] = useState('request');

  const [newEmail, setNewEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');

  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setResendSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [resendSeconds]);

  function clearFeedback() {
    setError(null);
    setMessage('');
  }

  function handleEmailChange(event) {
    setNewEmail(event.target.value);
    clearFeedback();
  }

  function handleOtpChange(event) {
    setOtp(event.target.value);
    setError(null);
  }

  async function handleRequest(event) {
    event.preventDefault();

    clearFeedback();

    const normalizedNewEmail = newEmail.trim().toLowerCase();

    if (normalizedNewEmail === user.email.trim().toLowerCase()) {
      setError({
        code: 'EMAIL_UNCHANGED',
        message: 'New email must be different from your current email.',
        fields: {
          newEmail: 'Enter a different email address.',
        },
      });

      return;
    }

    setLoading(true);

    try {
      const result = await requestEmailChange({
        newEmail: normalizedNewEmail,
      });

      const requestedEmail = result.newEmail || normalizedNewEmail;

      setPendingEmail(requestedEmail);
      setOtp('');

      setMessage(`We sent a verification code to ${requestedEmail}.`);

      setResendSeconds(EMAIL_CHANGE_RESEND_COOLDOWN_SECONDS);

      setStep('verify');
    } catch (requestError) {
      const normalizedError = normalizeApiError(
        requestError,
        'Unable to start the email change.',
      );

      if (normalizedError.code === 'EMAIL_ALREADY_IN_USE') {
        normalizedError.fields.newEmail =
          'This email address is already in use.';
      }

      if (normalizedError.code === 'EMAIL_UNCHANGED') {
        normalizedError.fields.newEmail = 'Enter a different email address.';
      }

      setError(normalizedError);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(event) {
    event.preventDefault();

    setError(null);
    setLoading(true);

    try {
      const result = await verifyEmailChange({
        otp,
      });

      dispatch(
        updateAuthenticatedUserEmail({
          email: result.email,
        }),
      );

      setMessage(`Your authentication email is now ${result.email}.`);

      setStep('success');
    } catch (requestError) {
      const normalizedError = normalizeApiError(
        requestError,
        'Unable to verify the email change.',
      );

      if (normalizedError.code === 'OTP_INVALID') {
        normalizedError.fields.otp = 'The verification code is incorrect.';
      }

      if (normalizedError.code === 'OTP_EXPIRED') {
        normalizedError.fields.otp =
          'This verification code has expired. Request a new code.';
      }

      setError(normalizedError);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (loading || resending || resendSeconds > 0) {
      return;
    }

    setError(null);
    setMessage('');
    setResending(true);

    try {
      const result = await requestEmailChange({
        newEmail: pendingEmail,
      });

      const requestedEmail = result.newEmail || pendingEmail;

      setPendingEmail(requestedEmail);
      setOtp('');

      setMessage(`A new verification code was sent to ${requestedEmail}.`);

      setResendSeconds(EMAIL_CHANGE_RESEND_COOLDOWN_SECONDS);
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          'Unable to resend the verification code.',
        ),
      );
    } finally {
      setResending(false);
    }
  }

  function handleChooseDifferentEmail() {
    setStep('request');

    setOtp('');
    setPendingEmail('');
    setMessage('');
    setError(null);
    setResendSeconds(0);
  }

  async function handleReauthenticate() {
    const currentEmail = user.email;

    setLoading(true);

    const result = await dispatch(logout());

    if (logout.fulfilled.match(result)) {
      navigate('/auth/login', {
        replace: true,
        state: {
          email: currentEmail,
          from: '/account/security/email',
          reauthRequired: true,
        },
      });

      return;
    }

    setLoading(false);

    setError(
      result.payload || {
        code: 'LOGOUT_FAILED',
        message: 'Unable to restart authentication. Please try again.',
        fields: {},
      },
    );
  }

  return (
    <main className='mx-auto max-w-2xl p-6'>
      <Link
        to='/account/security'
        className='text-sm font-medium underline underline-offset-4'>
        Back to security
      </Link>

      <div className='mt-8'>
        <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
          Account security
        </p>

        <h1 className='mt-3 text-3xl font-semibold'>
          Change authentication email
        </h1>

        <p className='mt-3 text-sm leading-6 text-neutral-600'>
          Your current authentication email is <strong>{user.email}</strong>.
        </p>
      </div>

      {step === 'request' && (
        <form onSubmit={handleRequest} className='mt-8 space-y-5'>
          <div>
            <label
              htmlFor='newEmail'
              className='mb-2 block text-sm font-medium'>
              New email
            </label>

            <input
              id='newEmail'
              name='newEmail'
              type='email'
              autoComplete='email'
              required
              value={newEmail}
              disabled={loading}
              onChange={handleEmailChange}
              placeholder='new@example.com'
              className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
            />

            {error?.fields?.newEmail && (
              <p className='mt-2 text-sm text-red-600'>
                {error.fields.newEmail}
              </p>
            )}
          </div>

          {error?.code === 'REAUTH_REQUIRED' && (
            <div
              role='alert'
              className='border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900'>
              <p className='font-medium'>Please sign in again</p>

              <p className='mt-2 leading-6'>
                Email changes are sensitive account actions. Your current
                sign-in is too old, so authenticate again before continuing.
              </p>

              <button
                type='button'
                disabled={loading}
                onClick={handleReauthenticate}
                className='mt-4 font-medium underline underline-offset-4 disabled:opacity-50'>
                Sign in again
              </button>
            </div>
          )}

          {error &&
            error.code !== 'REAUTH_REQUIRED' &&
            Object.keys(error.fields || {}).length === 0 && (
              <div
                role='alert'
                className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                {error.message}
              </div>
            )}

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-black px-4 py-3 font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50'>
            {loading
              ? 'Sending verification code...'
              : 'Send verification code'}
          </button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerify} className='mt-8 space-y-5'>
          {message && (
            <div
              role='status'
              className='border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
              {message}
            </div>
          )}

          <div className='border border-neutral-200 p-4'>
            <p className='text-sm text-neutral-500'>New authentication email</p>

            <p className='mt-1 font-medium'>{pendingEmail}</p>

            <button
              type='button'
              disabled={loading}
              onClick={handleChooseDifferentEmail}
              className='mt-3 text-sm font-medium underline underline-offset-4 disabled:opacity-50'>
              Use a different email
            </button>
          </div>

          <div>
            <label htmlFor='otp' className='mb-2 block text-sm font-medium'>
              Verification code
            </label>

            <input
              id='otp'
              name='otp'
              type='text'
              inputMode='numeric'
              autoComplete='one-time-code'
              required
              maxLength={6}
              value={otp}
              disabled={loading}
              onChange={handleOtpChange}
              placeholder='123456'
              className='w-full border border-neutral-300 px-4 py-3 tracking-[0.3em] outline-none transition focus:border-black disabled:bg-neutral-100'
            />

            {error?.fields?.otp && (
              <p className='mt-2 text-sm text-red-600'>{error.fields.otp}</p>
            )}
          </div>

          <div className='text-sm'>
            {resendSeconds > 0 ? (
              <p className='text-neutral-500'>
                Didn't receive the code? Resend in {resendSeconds}s
              </p>
            ) : (
              <button
                type='button'
                disabled={loading || resending}
                onClick={handleResend}
                className='font-medium underline underline-offset-4 disabled:opacity-50'>
                {resending ? 'Sending...' : 'Resend verification code'}
              </button>
            )}
          </div>

          {error?.code === 'REAUTH_REQUIRED' && (
            <div
              role='alert'
              className='border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900'>
              <p className='font-medium'>Please sign in again</p>

              <p className='mt-2 leading-6'>
                Your recent authentication has expired. Sign in again before
                requesting another verification code.
              </p>

              <button
                type='button'
                disabled={loading || resending}
                onClick={handleReauthenticate}
                className='mt-4 font-medium underline underline-offset-4 disabled:opacity-50'>
                Sign in again
              </button>
            </div>
          )}

          {error &&
            error.code !== 'REAUTH_REQUIRED' &&
            Object.keys(error.fields || {}).length === 0 && (
              <div
                role='alert'
                className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                {error.message}
              </div>
            )}

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-black px-4 py-3 font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50'>
            {loading ? 'Verifying...' : 'Verify and change email'}
          </button>
        </form>
      )}

      {step === 'success' && (
        <section className='mt-8 border border-green-200 bg-green-50 p-6'>
          <h2 className='text-lg font-semibold text-green-900'>
            Email changed successfully
          </h2>

          <p className='mt-2 text-sm leading-6 text-green-800'>{message}</p>

          <p className='mt-2 text-sm leading-6 text-green-800'>
            You are still signed in.
          </p>

          <Link
            to='/account'
            className='mt-5 inline-block font-medium text-green-900 underline underline-offset-4'>
            Back to account
          </Link>
        </section>
      )}
    </main>
  );
}

export default ChangeEmailPage;
