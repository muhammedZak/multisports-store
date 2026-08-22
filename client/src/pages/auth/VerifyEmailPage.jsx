import { useState } from 'react';

import { useLocation, useNavigate } from 'react-router';

import { resendVerification, verifyEmail } from '../../api/authApi.js';

import { normalizeApiError } from '../../api/errors.js';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';

import { AuthFooterLink } from '../../features/auth/components/AuthFooterLink.jsx';
import { AuthPageHeader } from '../../features/auth/components/AuthPageHeader.jsx';

import { AUTH_OTP_LENGTH } from '../../features/auth/auth.constants.js';

import { normalizeNumericOtp } from '../../features/auth/auth.utils.js';

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

      navigate(
        '/auth/login',

        {
          replace: true,

          state: {
            email,

            verified: true,
          },
        },
      );
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

  const busy = loading || resending;

  return (
    <div>
      <AuthPageHeader
        eyebrow='Email verification'
        title='Verify your email'
        description='Enter the verification code sent to your email address.'
      />

      <form onSubmit={handleVerify} className='mt-8 space-y-5'>
        <Input
          id='verify-email'
          name='email'
          label='Email'
          type='email'
          autoComplete='email'
          value={email}
          disabled={busy}
          placeholder='you@example.com'
          onChange={(event) => {
            setEmail(event.target.value);

            setError('');
          }}
        />

        <Input
          id='verify-email-code'
          name='otp'
          label='Verification code'
          type='text'
          inputMode='numeric'
          autoComplete='one-time-code'
          maxLength={AUTH_OTP_LENGTH}
          value={otp}
          disabled={busy}
          placeholder='000000'
          onChange={(event) => {
            setOtp(normalizeNumericOtp(event.target.value));

            setError('');
          }}
          className='tracking-[0.35em]'
        />

        {error ? <Alert variant='danger'>{error}</Alert> : null}

        {message ? <Alert variant='neutral'>{message}</Alert> : null}

        <Button
          type='submit'
          size='lg'
          disabled={busy || !email.trim() || otp.length !== AUTH_OTP_LENGTH}
          className='w-full'>
          {loading ? 'Verifying...' : 'Verify email'}
        </Button>
      </form>

      <section className='mt-6 text-center'>
        <p className='mb-2 text-sm text-[var(--color-muted)]'>
          Didn't receive the code?
        </p>

        <Button
          type='button'
          variant='quiet'
          size='sm'
          disabled={busy || !email.trim()}
          onClick={handleResend}>
          {resending ? 'Sending...' : 'Resend verification code'}
        </Button>
      </section>

      <AuthFooterLink
        to='/auth/login'
        state={{
          email,
        }}
        linkLabel='Back to login'>
        Already verified?
      </AuthFooterLink>
    </div>
  );
}

export default VerifyEmailPage;
