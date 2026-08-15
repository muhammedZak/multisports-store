import { useEffect, useState } from 'react';

import { Link, useLocation, useNavigate } from 'react-router';

import {
  requestPasswordRecovery,
  verifyPasswordRecovery,
} from '../../api/authApi.js';

import { normalizeApiError } from '../../api/errors.js';

const OTP_RESEND_COOLDOWN_SECONDS = 60;

function ForgotPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [step, setStep] = useState('request');

  const [email, setEmail] = useState(location.state?.email || '');

  const [otp, setOtp] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

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

  function handleEmailChange(event) {
    setEmail(event.target.value);
    setError(null);
  }

  function handleOtpChange(event) {
    const value = event.target.value.replace(/\D/g, '');

    setOtp(value);
    setError(null);
  }

  async function handleRequest(event) {
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
      setResendSeconds(OTP_RESEND_COOLDOWN_SECONDS);
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

  async function handleVerify(event) {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const result = await verifyPasswordRecovery({
        email,
        otp,
      });

      if (result.resetAuthorized) {
        navigate('/auth/reset-password', {
          replace: true,
          state: {
            email,
          },
        });
      }
    } catch (requestError) {
      setError(
        normalizeApiError(requestError, 'Unable to verify the recovery code.'),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (loading || resending || resendSeconds > 0) {
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
      setResendSeconds(OTP_RESEND_COOLDOWN_SECONDS);
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

  function handleChangeEmail() {
    setStep('request');
    setOtp('');
    setMessage('');
    setError(null);
    setResendSeconds(0);
  }

  return (
    <div>
      <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
        Account recovery
      </p>

      {step === 'request' && (
        <>
          <h1 className='mt-3 text-3xl font-semibold'>Forgot your password?</h1>

          <p className='mt-3 text-sm leading-6 text-neutral-600'>
            Enter your account email and we'll send you a password recovery
            code.
          </p>

          <form onSubmit={handleRequest} className='mt-8 space-y-5'>
            <div>
              <label htmlFor='email' className='mb-2 block text-sm font-medium'>
                Email
              </label>

              <input
                id='email'
                name='email'
                type='email'
                autoComplete='email'
                required
                value={email}
                disabled={loading}
                onChange={handleEmailChange}
                placeholder='you@example.com'
                className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
              />

              {error?.fields?.email && (
                <p className='mt-2 text-sm text-red-600'>
                  {error.fields.email}
                </p>
              )}
            </div>

            {error && (
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
              {loading ? 'Sending recovery code...' : 'Send recovery code'}
            </button>
          </form>
        </>
      )}

      {step === 'verify' && (
        <>
          <h1 className='mt-3 text-3xl font-semibold'>Verify recovery code</h1>

          <p className='mt-3 text-sm leading-6 text-neutral-600'>
            Enter the six-digit recovery code sent to your email.
          </p>

          <form onSubmit={handleVerify} className='mt-8 space-y-5'>
            {message && (
              <div
                role='status'
                className='border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700'>
                {message}
              </div>
            )}

            <div>
              <p className='text-sm text-neutral-600'>Recovery email</p>

              <p className='mt-1 font-medium'>{email}</p>

              <button
                type='button'
                disabled={loading || resending}
                onClick={handleChangeEmail}
                className='mt-2 text-sm font-medium underline underline-offset-4 disabled:opacity-50'>
                Use a different email
              </button>
            </div>

            <div>
              <label htmlFor='otp' className='mb-2 block text-sm font-medium'>
                Recovery code
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
                disabled={loading || resending}
                onChange={handleOtpChange}
                placeholder='123456'
                className='w-full border border-neutral-300 px-4 py-3 tracking-[0.35em] outline-none transition focus:border-black disabled:bg-neutral-100'
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
                  className='font-medium underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50'>
                  {resending ? 'Sending...' : 'Resend recovery code'}
                </button>
              )}
            </div>

            {error && (
              <div
                role='alert'
                className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                {error.message}
              </div>
            )}

            <button
              type='submit'
              disabled={loading || resending || otp.length !== 6}
              className='w-full bg-black px-4 py-3 font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50'>
              {loading ? 'Verifying...' : 'Verify recovery code'}
            </button>
          </form>
        </>
      )}

      <div className='mt-8 border-t border-neutral-200 pt-6 text-center'>
        <Link
          to='/auth/login'
          state={{ email }}
          className='text-sm font-medium underline underline-offset-4'>
          Back to login
        </Link>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
