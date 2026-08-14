import { useEffect, useState } from 'react';

import { Link, useLocation, useNavigate } from 'react-router';

import { useDispatch, useSelector } from 'react-redux';

import { clearAuthError, login } from '../../features/auth/authSlice.js';

function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { actionStatus, error } = useSelector((state) => state.auth);

  const [form, setForm] = useState({
    email: location.state?.email || '',
    password: '',
  });

  const loading = actionStatus === 'loading';

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (error) {
      dispatch(clearAuthError());
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const result = await dispatch(
      login({
        email: form.email,
        password: form.password,
      }),
    );

    if (login.fulfilled.match(result)) {
      const destination = location.state?.from || '/account';

      navigate(destination, {
        replace: true,
      });
    }
  }

  return (
    <div>
      <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
        Welcome back
      </p>

      <h1 className='mt-3 text-3xl font-semibold'>Login</h1>

      <p className='mt-3 text-sm leading-6 text-neutral-600'>
        Sign in to your MultiSports Store account.
      </p>

      {location.state?.verified && (
        <div
          role='status'
          className='mt-6 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
          Your email has been verified. You can now log in.
        </div>
      )}

      <form onSubmit={handleSubmit} className='mt-8 space-y-5'>
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
            value={form.email}
            disabled={loading}
            onChange={handleChange}
            placeholder='you@example.com'
            className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
          />

          {error?.fields?.email && (
            <p className='mt-2 text-sm text-red-600'>{error.fields.email}</p>
          )}
        </div>

        <div>
          <label htmlFor='password' className='mb-2 block text-sm font-medium'>
            Password
          </label>

          <input
            id='password'
            name='password'
            type='password'
            autoComplete='current-password'
            required
            value={form.password}
            disabled={loading}
            onChange={handleChange}
            placeholder='Enter your password'
            className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
          />

          {error?.fields?.password && (
            <p className='mt-2 text-sm text-red-600'>{error.fields.password}</p>
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
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className='mt-8 border-t border-neutral-200 pt-6 text-center'>
        <p className='text-sm text-neutral-600'>
          Don't have an account?{' '}
          <Link
            to='/auth/register'
            className='font-medium text-black underline underline-offset-4'>
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
