import { useState } from 'react';

import { Link, useLocation, useNavigate } from 'react-router';

import { resetPassword } from '../../api/authApi.js';

import { normalizeApiError } from '../../api/errors.js';

function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      await resetPassword({
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });

      navigate('/auth/login', {
        replace: true,
        state: {
          email: location.state?.email || '',
          passwordReset: true,
        },
      });
    } catch (requestError) {
      setError(
        normalizeApiError(requestError, 'Unable to reset your password.'),
      );
    } finally {
      setLoading(false);
    }
  }

  const recoveryAuthorizationError =
    error?.code === 'RECOVERY_NOT_AUTHORIZED' ||
    error?.code === 'RECOVERY_AUTHORIZATION_EXPIRED';

  return (
    <div>
      <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
        Account recovery
      </p>

      <h1 className='mt-3 text-3xl font-semibold'>Reset your password</h1>

      <p className='mt-3 text-sm leading-6 text-neutral-600'>
        Create a new password for your MultiSports Store account.
      </p>

      <form onSubmit={handleSubmit} className='mt-8 space-y-5'>
        <div>
          <label
            htmlFor='newPassword'
            className='mb-2 block text-sm font-medium'>
            New password
          </label>

          <input
            id='newPassword'
            name='newPassword'
            type='password'
            autoComplete='new-password'
            required
            minLength={8}
            maxLength={128}
            value={form.newPassword}
            disabled={loading}
            onChange={handleChange}
            placeholder='Create a new password'
            className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
          />

          <p className='mt-2 text-xs text-neutral-500'>
            8–128 characters with at least one letter and one number.
          </p>

          {error?.fields?.newPassword && (
            <p className='mt-2 text-sm text-red-600'>
              {error.fields.newPassword}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor='confirmPassword'
            className='mb-2 block text-sm font-medium'>
            Confirm new password
          </label>

          <input
            id='confirmPassword'
            name='confirmPassword'
            type='password'
            autoComplete='new-password'
            required
            minLength={8}
            maxLength={128}
            value={form.confirmPassword}
            disabled={loading}
            onChange={handleChange}
            placeholder='Enter the new password again'
            className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
          />

          {error?.fields?.confirmPassword && (
            <p className='mt-2 text-sm text-red-600'>
              {error.fields.confirmPassword}
            </p>
          )}
        </div>

        {error && (
          <div
            role='alert'
            className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error.message}

            {recoveryAuthorizationError && (
              <div className='mt-3'>
                <Link
                  to='/auth/forgot-password'
                  state={{
                    email: location.state?.email || '',
                  }}
                  className='font-medium underline underline-offset-4'>
                  Start password recovery again
                </Link>
              </div>
            )}
          </div>
        )}

        <button
          type='submit'
          disabled={loading}
          className='w-full bg-black px-4 py-3 font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50'>
          {loading ? 'Resetting password...' : 'Reset password'}
        </button>
      </form>

      <div className='mt-8 border-t border-neutral-200 pt-6 text-center'>
        <Link
          to='/auth/login'
          state={{
            email: location.state?.email || '',
          }}
          className='text-sm font-medium underline underline-offset-4'>
          Back to login
        </Link>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
