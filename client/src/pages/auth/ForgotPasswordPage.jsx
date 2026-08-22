import { useLocation, useNavigate } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';

import { AuthFooterLink } from '../../features/auth/components/AuthFooterLink.jsx';
import { AuthPageHeader } from '../../features/auth/components/AuthPageHeader.jsx';

import { AUTH_OTP_LENGTH } from '../../features/auth/auth.constants.js';

import { usePasswordRecovery } from '../../features/auth/hooks/usePasswordRecovery.js';

function ForgotPasswordPage() {
  const location = useLocation();

  const navigate = useNavigate();

  const recovery = usePasswordRecovery({
    initialEmail: location.state?.email || '',

    onAuthorized(email) {
      navigate(
        '/auth/reset-password',

        {
          replace: true,

          state: {
            email,
          },
        },
      );
    },
  });

  return (
    <div>
      <AuthPageHeader
        eyebrow='Account recovery'
        title={
          recovery.step === 'request'
            ? 'Forgot your password?'
            : 'Verify recovery code'
        }
        description={
          recovery.step === 'request'
            ? "Enter your account email and we'll send you a password recovery code."
            : 'Enter the six-digit recovery code sent to your email.'
        }
      />

      {recovery.step === 'request' ? (
        <form onSubmit={recovery.requestRecovery} className='mt-8 space-y-5'>
          <Input
            id='recovery-email'
            name='email'
            label='Email'
            type='email'
            autoComplete='email'
            required
            value={recovery.email}
            disabled={recovery.loading}
            placeholder='you@example.com'
            error={recovery.error?.fields?.email}
            onChange={recovery.handleEmailChange}
          />

          {recovery.error ? (
            <Alert variant='danger'>{recovery.error.message}</Alert>
          ) : null}

          <Button
            type='submit'
            size='lg'
            disabled={recovery.loading}
            className='w-full'>
            {recovery.loading
              ? 'Sending recovery code...'
              : 'Send recovery code'}
          </Button>
        </form>
      ) : null}

      {recovery.step === 'verify' ? (
        <form onSubmit={recovery.verifyRecovery} className='mt-8 space-y-5'>
          {recovery.message ? (
            <Alert variant='neutral'>{recovery.message}</Alert>
          ) : null}

          <section className='border-y border-[var(--color-border)] py-5'>
            <p className='mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
              Recovery email
            </p>

            <p className='mb-0 break-all font-bold'>{recovery.email}</p>

            <Button
              type='button'
              variant='quiet'
              size='sm'
              disabled={recovery.loading || recovery.resending}
              onClick={recovery.changeEmail}
              className='mt-2'>
              Use a different email
            </Button>
          </section>

          <Input
            id='recovery-code'
            name='otp'
            label='Recovery code'
            type='text'
            inputMode='numeric'
            autoComplete='one-time-code'
            required
            maxLength={AUTH_OTP_LENGTH}
            value={recovery.otp}
            disabled={recovery.loading || recovery.resending}
            placeholder='123456'
            error={recovery.error?.fields?.otp}
            onChange={recovery.handleOtpChange}
            className='tracking-[0.35em]'
          />

          <div className='text-sm'>
            {recovery.resendSeconds > 0 ? (
              <p className='mb-0 text-[var(--color-muted)]'>
                Didn't receive the code? Resend in {recovery.resendSeconds}s
              </p>
            ) : (
              <Button
                type='button'
                variant='quiet'
                size='sm'
                disabled={recovery.loading || recovery.resending}
                onClick={recovery.resendRecovery}>
                {recovery.resending ? 'Sending...' : 'Resend recovery code'}
              </Button>
            )}
          </div>

          {recovery.error ? (
            <Alert variant='danger'>{recovery.error.message}</Alert>
          ) : null}

          <Button
            type='submit'
            size='lg'
            disabled={
              recovery.loading ||
              recovery.resending ||
              recovery.otp.length !== AUTH_OTP_LENGTH
            }
            className='w-full'>
            {recovery.loading ? 'Verifying...' : 'Verify recovery code'}
          </Button>
        </form>
      ) : null}

      <AuthFooterLink
        to='/auth/login'
        state={{
          email: recovery.email,
        }}
        linkLabel='Back to login'>
        Remembered your password?
      </AuthFooterLink>
    </div>
  );
}

export default ForgotPasswordPage;
