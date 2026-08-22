import { useState } from 'react';

import { Link, useLocation, useNavigate } from 'react-router';

import { resetPassword } from '../../api/authApi.js';

import { normalizeApiError } from '../../api/errors.js';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';

import { AuthFooterLink } from '../../features/auth/components/AuthFooterLink.jsx';
import { AuthPageHeader } from '../../features/auth/components/AuthPageHeader.jsx';

import { AUTH_PASSWORD_HINT } from '../../features/auth/auth.constants.js';

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

      navigate(
        '/auth/login',

        {
          replace: true,

          state: {
            email: location.state?.email || '',

            passwordReset: true,
          },
        },
      );
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,

          'Unable to reset your password.',
        ),
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
      <AuthPageHeader
        eyebrow='Account recovery'
        title='Reset your password'
        description='Create a new password for your MultiSports Store account.'
      />

      <form onSubmit={handleSubmit} className='mt-8 space-y-5'>
        <Input
          id='reset-new-password'
          name='newPassword'
          label='New password'
          type='password'
          autoComplete='new-password'
          required
          minLength={8}
          maxLength={128}
          value={form.newPassword}
          disabled={loading}
          placeholder='Create a new password'
          hint={error?.fields?.newPassword ? undefined : AUTH_PASSWORD_HINT}
          error={error?.fields?.newPassword}
          onChange={handleChange}
        />

        <Input
          id='reset-confirm-password'
          name='confirmPassword'
          label='Confirm new password'
          type='password'
          autoComplete='new-password'
          required
          minLength={8}
          maxLength={128}
          value={form.confirmPassword}
          disabled={loading}
          placeholder='Enter the new password again'
          error={error?.fields?.confirmPassword}
          onChange={handleChange}
        />

        {error ? (
          <Alert variant='danger'>
            <p className='mb-0'>{error.message}</p>

            {recoveryAuthorizationError ? (
              <Link
                to='/auth/forgot-password'
                state={{
                  email: location.state?.email || '',
                }}
                className='mt-3 inline-flex font-semibold underline underline-offset-4'>
                Start password recovery again
              </Link>
            ) : null}
          </Alert>
        ) : null}

        <Button type='submit' size='lg' disabled={loading} className='w-full'>
          {loading ? 'Resetting password...' : 'Reset password'}
        </Button>
      </form>

      <AuthFooterLink
        to='/auth/login'
        state={{
          email: location.state?.email || '',
        }}
        linkLabel='Back to login'>
        Return without resetting?
      </AuthFooterLink>
    </div>
  );
}

export default ResetPasswordPage;
