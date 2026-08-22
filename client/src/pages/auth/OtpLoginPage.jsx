import { Link, useLocation, useNavigate } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';

import { AuthFooterLink } from '../../features/auth/components/AuthFooterLink.jsx';
import { AuthPageHeader } from '../../features/auth/components/AuthPageHeader.jsx';

import { useOtpLogin } from '../../features/auth/hooks/useOtpLogin.js';

import { getCustomerAuthDestination } from '../../features/auth/auth.utils.js';

function OtpLoginPage() {
  const navigate = useNavigate();

  const location = useLocation();

  const otpLogin = useOtpLogin({
    initialEmail: location.state?.email || '',

    onAuthenticated() {
      navigate(
        getCustomerAuthDestination(location.state?.from),

        {
          replace: true,
        },
      );
    },
  });

  return (
    <div>
      <AuthPageHeader
        eyebrow='Passwordless login'
        title='Login with email code'
        description="Enter your account email and we'll send you a one-time login code."
      />

      {otpLogin.googleLinkPending ? (
        <Alert variant='warning' className='mt-6'>
          After verifying your login code, you will finish linking your Google
          account.
        </Alert>
      ) : null}

      {otpLogin.step === 'request' ? (
        <form onSubmit={otpLogin.requestOtp} className='mt-8 space-y-5'>
          <Input
            id='otp-login-email'
            name='email'
            label='Email'
            type='email'
            autoComplete='email'
            required
            value={otpLogin.email}
            disabled={otpLogin.loading}
            placeholder='you@example.com'
            error={otpLogin.error?.fields?.email}
            onChange={otpLogin.handleEmailChange}
          />

          {otpLogin.error ? (
            <Alert variant='danger'>{otpLogin.error.message}</Alert>
          ) : null}

          <Button
            type='submit'
            size='lg'
            disabled={otpLogin.loading}
            className='w-full'>
            {otpLogin.loading ? 'Sending code...' : 'Send login code'}
          </Button>
        </form>
      ) : null}

      {otpLogin.step === 'verify' ? (
        <form onSubmit={otpLogin.verifyOtp} className='mt-8 space-y-5'>
          {otpLogin.message ? (
            <Alert variant='success'>{otpLogin.message}</Alert>
          ) : null}

          <section className='border-y border-[var(--color-border)] py-5'>
            <p className='mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
              Login email
            </p>

            <p className='mb-0 break-all font-bold'>{otpLogin.email}</p>

            <Button
              type='button'
              variant='quiet'
              size='sm'
              disabled={otpLogin.loading}
              onClick={otpLogin.changeEmail}
              className='mt-2'>
              Use a different email
            </Button>
          </section>

          <Input
            id='otp-login-code'
            name='otp'
            label='Login code'
            type='text'
            inputMode='numeric'
            autoComplete='one-time-code'
            required
            maxLength={6}
            value={otpLogin.otp}
            disabled={otpLogin.loading}
            placeholder='123456'
            error={otpLogin.error?.fields?.otp}
            onChange={otpLogin.handleOtpChange}
            className='tracking-[0.3em]'
          />

          <div className='text-sm'>
            {otpLogin.resendSeconds > 0 ? (
              <p className='mb-0 text-[var(--color-muted)]'>
                Didn't receive the code? Resend in {otpLogin.resendSeconds}s
              </p>
            ) : (
              <Button
                type='button'
                variant='quiet'
                size='sm'
                disabled={otpLogin.loading || otpLogin.resending}
                onClick={otpLogin.resendOtp}>
                {otpLogin.resending ? 'Sending...' : 'Resend code'}
              </Button>
            )}
          </div>

          {otpLogin.error ? (
            <Alert variant='danger'>{otpLogin.error.message}</Alert>
          ) : null}

          <Button
            type='submit'
            size='lg'
            disabled={otpLogin.loading}
            className='w-full'>
            {otpLogin.loading && !otpLogin.resending
              ? 'Verifying...'
              : 'Verify and login'}
          </Button>
        </form>
      ) : null}

      <AuthFooterLink
        to='/auth/login'
        state={{
          email: otpLogin.email,

          from: location.state?.from,
        }}
        linkLabel='Login with password'>
        Prefer your password?
      </AuthFooterLink>
    </div>
  );
}

export default OtpLoginPage;
