import { useEffect, useState } from 'react';

import { Link, useNavigate } from 'react-router';

import { useDispatch, useSelector } from 'react-redux';

import { requestEmailChange, verifyEmailChange } from '../../api/authApi.js';

import { normalizeApiError } from '../../api/errors.js';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';

import { AccountPageHeader } from '../../features/account/components/AccountPageHeader.jsx';

import { EMAIL_CHANGE_RESEND_COOLDOWN_SECONDS } from '../../features/account/account.constants.js';

import {
  logout,
  updateAuthenticatedUserEmail,
} from '../../features/auth/authSlice.js';

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
    <div className='max-w-2xl'>
      <AccountPageHeader
        eyebrow='Account security'
        title='Change authentication email'
        description={
          <>
            Your current authentication email is{' '}
            <strong className='text-[var(--color-ink)]'>{user.email}</strong>.
          </>
        }
        backTo='/account/security'
        backLabel='Security'
      />

      {step === 'request' ? (
        <form onSubmit={handleRequest} className='mt-8 space-y-5'>
          <Input
            id='newEmail'
            name='newEmail'
            label='New email'
            type='email'
            autoComplete='email'
            required
            value={newEmail}
            disabled={loading}
            placeholder='new@example.com'
            error={error?.fields?.newEmail}
            onChange={handleEmailChange}
          />

          {error?.code === 'REAUTH_REQUIRED' ? (
            <Alert variant='warning' title='Please sign in again'>
              <p className='mb-3'>
                Email changes are sensitive account actions. Your current
                sign-in is too old, so authenticate again before continuing.
              </p>

              <Button
                type='button'
                variant='secondary'
                size='sm'
                disabled={loading}
                onClick={handleReauthenticate}>
                Sign in again
              </Button>
            </Alert>
          ) : null}

          {error &&
          error.code !== 'REAUTH_REQUIRED' &&
          Object.keys(error.fields || {}).length === 0 ? (
            <Alert variant='danger'>{error.message}</Alert>
          ) : null}

          <Button type='submit' size='lg' disabled={loading}>
            {loading
              ? 'Sending verification code...'
              : 'Send verification code'}
          </Button>
        </form>
      ) : null}

      {step === 'verify' ? (
        <form onSubmit={handleVerify} className='mt-8 space-y-5'>
          {message ? <Alert variant='success'>{message}</Alert> : null}

          <section className='border-y border-[var(--color-border)] py-5'>
            <p className='mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
              New authentication email
            </p>

            <p className='mb-0 font-bold'>{pendingEmail}</p>

            <Button
              type='button'
              variant='quiet'
              size='sm'
              disabled={loading}
              onClick={handleChooseDifferentEmail}
              className='mt-3'>
              Use a different email
            </Button>
          </section>

          <Input
            id='otp'
            name='otp'
            label='Verification code'
            type='text'
            inputMode='numeric'
            autoComplete='one-time-code'
            required
            maxLength={6}
            value={otp}
            disabled={loading}
            placeholder='123456'
            error={error?.fields?.otp}
            onChange={handleOtpChange}
            className='tracking-[0.3em]'
          />

          <div className='text-sm'>
            {resendSeconds > 0 ? (
              <p className='mb-0 text-[var(--color-muted)]'>
                Didn't receive the code? Resend in {resendSeconds}s
              </p>
            ) : (
              <Button
                type='button'
                variant='quiet'
                size='sm'
                disabled={loading || resending}
                onClick={handleResend}>
                {resending ? 'Sending...' : 'Resend verification code'}
              </Button>
            )}
          </div>

          {error?.code === 'REAUTH_REQUIRED' ? (
            <Alert variant='warning' title='Please sign in again'>
              <p className='mb-3'>
                Your recent authentication has expired. Sign in again before
                requesting another verification code.
              </p>

              <Button
                type='button'
                variant='secondary'
                size='sm'
                disabled={loading || resending}
                onClick={handleReauthenticate}>
                Sign in again
              </Button>
            </Alert>
          ) : null}

          {error &&
          error.code !== 'REAUTH_REQUIRED' &&
          Object.keys(error.fields || {}).length === 0 ? (
            <Alert variant='danger'>{error.message}</Alert>
          ) : null}

          <Button type='submit' size='lg' disabled={loading}>
            {loading ? 'Verifying...' : 'Verify and change email'}
          </Button>
        </form>
      ) : null}

      {step === 'success' ? (
        <Alert
          variant='success'
          title='Email changed successfully'
          className='mt-8'>
          <p className='mb-1'>{message}</p>

          <p className='mb-4'>You are still signed in.</p>

          <Link
            to='/account'
            className='font-semibold underline underline-offset-4'>
            Back to account
          </Link>
        </Alert>
      ) : null}
    </div>
  );
}

export default ChangeEmailPage;
