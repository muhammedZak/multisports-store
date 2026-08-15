import { useState } from 'react';
import { Link } from 'react-router';

import { changePassword } from '../../api/authApi.js';
import { normalizeApiError } from '../../api/errors.js';

function SecurityPage() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError(null);
    setSuccessMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError(null);
    setSuccessMessage('');

    if (form.newPassword !== form.confirmPassword) {
      setError({
        code: 'VALIDATION_ERROR',
        message: 'Please correct the invalid fields.',
        fields: {
          confirmPassword: 'Passwords do not match.',
        },
      });

      return;
    }

    if (form.currentPassword === form.newPassword) {
      setError({
        code: 'PASSWORD_REUSE_NOT_ALLOWED',
        message: 'New password must be different from your current password.',
        fields: {
          newPassword:
            'New password must be different from your current password.',
        },
      });

      return;
    }

    setLoading(true);

    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });

      setForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setSuccessMessage('Your password has been changed successfully.');
    } catch (requestError) {
      const normalizedError = normalizeApiError(
        requestError,
        'Unable to change your password.',
      );

      if (normalizedError.code === 'CURRENT_PASSWORD_INVALID') {
        normalizedError.fields.currentPassword =
          'Your current password is incorrect.';
      }

      if (normalizedError.code === 'PASSWORD_REUSE_NOT_ALLOWED') {
        normalizedError.fields.newPassword =
          'New password must be different from your current password.';
      }

      setError(normalizedError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className='mx-auto max-w-2xl p-6'>
      <Link
        to='/account'
        className='text-sm font-medium underline underline-offset-4'>
        Back to account
      </Link>

      <div className='mt-8'>
        <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
          Account security
        </p>

        <section className='mt-6 border border-neutral-200 p-5'>
          <h2 className='font-semibold'>Authentication email</h2>

          <p className='mt-2 text-sm leading-6 text-neutral-600'>
            Change the email address you use to sign in. Your new address must
            be verified before the change is completed.
          </p>

          <Link
            to='/account/security/email'
            className='mt-4 inline-block text-sm font-medium underline underline-offset-4'>
            Change authentication email
          </Link>
        </section>

        <h1 className='mt-3 text-3xl font-semibold'>Change password</h1>

        <p className='mt-3 text-sm leading-6 text-neutral-600'>
          Enter your current password before creating a new one.
        </p>
      </div>

      <form onSubmit={handleSubmit} className='mt-8 space-y-5'>
        <div>
          <label
            htmlFor='currentPassword'
            className='mb-2 block text-sm font-medium'>
            Current password
          </label>

          <input
            id='currentPassword'
            name='currentPassword'
            type='password'
            autoComplete='current-password'
            required
            maxLength={128}
            value={form.currentPassword}
            disabled={loading}
            onChange={handleChange}
            className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
          />

          {error?.fields?.currentPassword && (
            <p className='mt-2 text-sm text-red-600'>
              {error.fields.currentPassword}
            </p>
          )}
        </div>

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
            className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
          />

          {error?.fields?.confirmPassword && (
            <p className='mt-2 text-sm text-red-600'>
              {error.fields.confirmPassword}
            </p>
          )}
        </div>

        {successMessage && (
          <div
            role='status'
            className='border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
            {successMessage}
          </div>
        )}

        {error && Object.keys(error.fields || {}).length === 0 && (
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
          {loading ? 'Changing password...' : 'Change password'}
        </button>
      </form>
    </main>
  );
}

export default SecurityPage;
