import { useState } from 'react';

import { Link } from 'react-router';

import { changePassword } from '../../api/authApi.js';

import { normalizeApiError } from '../../api/errors.js';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';

import { AccountPageHeader } from '../../features/account/components/AccountPageHeader.jsx';

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
    <div className='max-w-2xl'>
      <AccountPageHeader
        eyebrow='Account security'
        title='Security'
        description='Manage your authentication email and password.'
      />

      <section className='mt-8 border-y border-[var(--color-border)] py-6'>
        <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
          Sign-in identity
        </p>

        <h2 className='mb-0 text-lg font-black tracking-[-0.02em]'>
          Authentication email
        </h2>

        <p className='mt-2 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
          Change the email address you use to sign in. Your new address must be
          verified before the change is completed.
        </p>

        <Link
          to='/account/security/email'
          className='mt-4 inline-flex text-sm font-semibold underline underline-offset-4'>
          Change authentication email
        </Link>
      </section>

      <section className='mt-8'>
        <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
          Password
        </p>

        <h2 className='mb-0 text-lg font-black tracking-[-0.02em]'>
          Change password
        </h2>

        <p className='mt-2 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
          Enter your current password before creating a new one.
        </p>

        <form onSubmit={handleSubmit} className='mt-6 space-y-5'>
          <Input
            id='currentPassword'
            name='currentPassword'
            label='Current password'
            type='password'
            autoComplete='current-password'
            required
            maxLength={128}
            value={form.currentPassword}
            disabled={loading}
            error={error?.fields?.currentPassword}
            onChange={handleChange}
          />

          <Input
            id='newPassword'
            name='newPassword'
            label='New password'
            type='password'
            autoComplete='new-password'
            required
            minLength={8}
            maxLength={128}
            value={form.newPassword}
            disabled={loading}
            hint='8–128 characters with at least one letter and one number.'
            error={error?.fields?.newPassword}
            onChange={handleChange}
          />

          <Input
            id='confirmPassword'
            name='confirmPassword'
            label='Confirm new password'
            type='password'
            autoComplete='new-password'
            required
            minLength={8}
            maxLength={128}
            value={form.confirmPassword}
            disabled={loading}
            error={error?.fields?.confirmPassword}
            onChange={handleChange}
          />

          {successMessage ? (
            <Alert variant='success'>{successMessage}</Alert>
          ) : null}

          {error && Object.keys(error.fields || {}).length === 0 ? (
            <Alert variant='danger'>{error.message}</Alert>
          ) : null}

          <Button type='submit' size='lg' disabled={loading}>
            {loading ? 'Changing password...' : 'Change password'}
          </Button>
        </form>
      </section>
    </div>
  );
}

export default SecurityPage;
