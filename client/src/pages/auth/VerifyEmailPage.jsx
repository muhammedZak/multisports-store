import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { resendVerification, verifyEmail } from '../../api/authApi.js';

import { normalizeApiError } from '../../api/errors.js';

function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(location.state?.email || '');

  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);

  const [resending, setResending] = useState(false);

  const [error, setError] = useState('');

  const [message, setMessage] = useState('');

  async function handleVerify(event) {
    event.preventDefault();

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await verifyEmail({
        email,
        otp,
      });

      navigate('/auth/login', {
        replace: true,
        state: {
          email,
          verified: true,
        },
      });
    } catch (requestError) {
      const apiError = normalizeApiError(
        requestError,
        'Email verification failed.',
      );

      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email.trim()) {
      setError('Enter your email address before requesting a new code.');
      return;
    }

    setResending(true);
    setError('');
    setMessage('');

    try {
      const result = await resendVerification({
        email,
      });

      setMessage(
        result.message || 'A new verification code has been requested.',
      );
    } catch (requestError) {
      const apiError = normalizeApiError(
        requestError,
        'Unable to resend the verification code.',
      );

      setError(apiError.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <div>
      <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
        Email verification
      </p>

      <h1 className='mt-3 text-3xl font-semibold'>Verify your email</h1>

      <p className='mt-3 text-sm leading-6 text-neutral-600'>
        Enter the verification code sent to your email address.
      </p>

      <form onSubmit={handleVerify} className='mt-8 space-y-5'>
        <div>
          <label htmlFor='email' className='mb-2 block text-sm font-medium'>
            Email
          </label>

          <input
            id='email'
            name='email'
            type='email'
            autoComplete='email'
            value={email}
            disabled={loading || resending}
            onChange={(event) => {
              setEmail(event.target.value);
              setError('');
            }}
            className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
            placeholder='you@example.com'
          />
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
            maxLength={6}
            value={otp}
            disabled={loading || resending}
            onChange={(event) => {
              const value = event.target.value.replace(/\D/g, '');

              setOtp(value);
              setError('');
            }}
            className='w-full border border-neutral-300 px-4 py-3 tracking-[0.35em] outline-none transition focus:border-black disabled:bg-neutral-100'
            placeholder='000000'
          />
        </div>

        {error && (
          <div
            role='alert'
            className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        )}

        {message && (
          <div
            role='status'
            className='border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700'>
            {message}
          </div>
        )}

        <button
          type='submit'
          disabled={loading || resending || !email.trim() || otp.length !== 6}
          className='w-full bg-black px-4 py-3 font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50'>
          {loading ? 'Verifying...' : 'Verify email'}
        </button>
      </form>

      <div className='mt-5 text-center'>
        <p className='text-sm text-neutral-600'>Didn't receive the code?</p>

        <button
          type='button'
          disabled={loading || resending || !email.trim()}
          onClick={handleResend}
          className='mt-2 text-sm font-medium underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50'>
          {resending ? 'Sending...' : 'Resend verification code'}
        </button>
      </div>

      <div className='mt-8 border-t border-neutral-200 pt-6 text-center'>
        <Link
          to='/auth/login'
          className='text-sm font-medium underline underline-offset-4'>
          Back to login
        </Link>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
