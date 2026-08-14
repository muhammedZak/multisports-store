import { useEffect, useState } from 'react';

import { Link, useLocation, useNavigate } from 'react-router';

import { useDispatch, useSelector } from 'react-redux';

import {
  clearAuthError,
  requestOtpLogin,
  verifyOtpLogin,
} from '../../features/auth/authSlice.js';

function OtpLoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { actionStatus, error } = useSelector((state) => state.auth);

  const [step, setStep] = useState('request');

  const [email, setEmail] = useState(location.state?.email || '');

  const [otp, setOtp] = useState('');

  const [message, setMessage] = useState('');

  const loading = actionStatus === 'loading';

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  function handleEmailChange(event) {
    setEmail(event.target.value);

    if (error) {
      dispatch(clearAuthError());
    }
  }

  function handleOtpChange(event) {
    setOtp(event.target.value);

    if (error) {
      dispatch(clearAuthError());
    }
  }

  async function handleRequestOtp(event) {
    event.preventDefault();

    const result = await dispatch(
      requestOtpLogin({
        email,
      }),
    );

    if (requestOtpLogin.fulfilled.match(result)) {
      setMessage(result.payload.message);
      setStep('verify');
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();

    const result = await dispatch(
      verifyOtpLogin({
        email,
        otp,
      }),
    );

    if (verifyOtpLogin.fulfilled.match(result)) {
      const destination = location.state?.from || '/account';

      navigate(destination, {
        replace: true,
      });
    }
  }

  function handleChangeEmail() {
    setStep('request');
    setOtp('');
    setMessage('');
    dispatch(clearAuthError());
  }

  return (
    <div>
      <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
        Passwordless login
      </p>

      <h1 className='mt-3 text-3xl font-semibold'>Login with email code</h1>

      <p className='mt-3 text-sm leading-6 text-neutral-600'>
        Enter your account email and we'll send you a one-time login code.
      </p>

      {step === 'request' && (
        <form onSubmit={handleRequestOtp} className='mt-8 space-y-5'>
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
              <p className='mt-2 text-sm text-red-600'>{error.fields.email}</p>
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
            {loading ? 'Sending code...' : 'Send login code'}
          </button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerifyOtp} className='mt-8 space-y-5'>
          {message && (
            <div
              role='status'
              className='border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
              {message}
            </div>
          )}

          <div>
            <p className='text-sm text-neutral-600'>Login email</p>

            <p className='mt-1 font-medium'>{email}</p>

            <button
              type='button'
              disabled={loading}
              onClick={handleChangeEmail}
              className='mt-2 text-sm font-medium underline underline-offset-4'>
              Use a different email
            </button>
          </div>

          <div>
            <label htmlFor='otp' className='mb-2 block text-sm font-medium'>
              Login code
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
            {loading ? 'Verifying...' : 'Verify and login'}
          </button>
        </form>
      )}

      <div className='mt-8 border-t border-neutral-200 pt-6 text-center'>
        <p className='text-sm text-neutral-600'>
          Prefer your password?{' '}
          <Link
            to='/auth/login'
            state={{
              email,
              from: location.state?.from,
            }}
            className='font-medium text-black underline underline-offset-4'>
            Login with password
          </Link>
        </p>
      </div>
    </div>
  );
}

export default OtpLoginPage;
