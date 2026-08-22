import { useEffect, useState } from 'react';

import { Link, useLocation, useNavigate } from 'react-router';

import { useDispatch, useSelector } from 'react-redux';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';

import { AuthDivider } from '../../features/auth/components/AuthDivider.jsx';
import { AuthFooterLink } from '../../features/auth/components/AuthFooterLink.jsx';
import { AuthPageHeader } from '../../features/auth/components/AuthPageHeader.jsx';

import GoogleSignInButton from '../../features/auth/GoogleSignInButton.jsx';

import {
  clearAuthError,
  clearGoogleLinkPending,
  login,
  signInWithGoogle,
} from '../../features/auth/authSlice.js';

import {
  getCustomerAuthDestination,
  getPasswordLoginDestination,
} from '../../features/auth/auth.utils.js';

function LoginPage() {
  const dispatch = useDispatch();

  const navigate = useNavigate();

  const location = useLocation();

  const { actionStatus, error, googleLinkPending } = useSelector(
    (state) => state.auth,
  );

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
      navigate(
        getPasswordLoginDestination(
          result.payload,

          location.state?.from,
        ),

        {
          replace: true,
        },
      );
    }
  }

  async function handleGoogleCredential(credential) {
    const result = await dispatch(
      signInWithGoogle({
        credential,
      }),
    );

    if (signInWithGoogle.fulfilled.match(result)) {
      navigate(
        getCustomerAuthDestination(location.state?.from),

        {
          replace: true,
        },
      );
    }
  }

  return (
    <div>
      <AuthPageHeader
        eyebrow='Welcome back'
        title='Login'
        description='Sign in to your MultiSports Store account.'
      />

      {location.state?.reauthRequired ? (
        <Alert variant='warning' className='mt-6'>
          Sign in again to continue changing your authentication email.
        </Alert>
      ) : null}

      {location.state?.verified ? (
        <Alert variant='success' className='mt-6'>
          Your email has been verified. You can now log in.
        </Alert>
      ) : null}

      {location.state?.passwordReset ? (
        <Alert variant='success' className='mt-6'>
          Your password has been reset successfully. You can now log in with
          your new password.
        </Alert>
      ) : null}

      <div className='mt-8'>
        <GoogleSignInButton
          disabled={loading}
          onCredential={handleGoogleCredential}
        />
      </div>

      <AuthDivider />

      {googleLinkPending ? (
        <Alert
          variant='warning'
          title='Existing account found'
          className='mb-6'
          actions={
            <Button
              type='button'
              variant='quiet'
              size='sm'
              disabled={loading}
              onClick={() => dispatch(clearGoogleLinkPending())}>
              Cancel linking
            </Button>
          }>
          <p className='mb-2'>
            This email already has a MultiSports Store account.
          </p>

          <p className='mb-0'>
            Sign in with your password or email login code to prove ownership.
            After login, you can finish linking Google from your account.
          </p>
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className='space-y-5'>
        <Input
          id='login-email'
          name='email'
          label='Email'
          type='email'
          autoComplete='email'
          required
          value={form.email}
          disabled={loading}
          placeholder='you@example.com'
          error={error?.fields?.email}
          onChange={handleChange}
        />

        <div>
          <Input
            id='login-password'
            name='password'
            label='Password'
            type='password'
            autoComplete='current-password'
            required
            value={form.password}
            disabled={loading}
            placeholder='Enter your password'
            error={error?.fields?.password}
            onChange={handleChange}
          />

          <div className='mt-2 text-right'>
            <Link
              to='/auth/forgot-password'
              state={{
                email: form.email,
              }}
              className='text-sm font-semibold underline decoration-[var(--color-border-strong)] underline-offset-4'>
              Forgot password?
            </Link>
          </div>
        </div>

        {error && error.code !== 'ACCOUNT_LINK_REQUIRED' ? (
          <Alert variant='danger'>{error.message}</Alert>
        ) : null}

        <Button type='submit' size='lg' disabled={loading} className='w-full'>
          {loading ? 'Logging in...' : 'Login'}
        </Button>

        <div className='text-center'>
          <Link
            to='/auth/login-otp'
            state={{
              email: form.email,

              from: location.state?.from,
            }}
            className='text-sm font-semibold underline decoration-[var(--color-border-strong)] underline-offset-4'>
            Login with email code
          </Link>
        </div>
      </form>

      <AuthFooterLink to='/auth/register' linkLabel='Create account'>
        Don't have an account?
      </AuthFooterLink>
    </div>
  );
}

export default LoginPage;
