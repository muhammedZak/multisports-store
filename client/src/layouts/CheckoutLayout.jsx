import { Link, Outlet } from 'react-router';

import { AppLogo } from '../components/shared/AppLogo.jsx';

function CheckoutLayout() {
  return (
    <div className='min-h-screen bg-white text-[var(--color-ink)]'>
      <header className='border-b border-[var(--color-border)]'>
        <div className='ds-container flex min-h-16 items-center justify-between gap-6'>
          <AppLogo />

          <div className='flex items-center gap-5'>
            <p className='mb-0 hidden text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)] sm:block'>
              Secure checkout
            </p>

            <Link
              to='/cart'
              className='text-sm font-semibold text-[var(--color-ink)] underline decoration-[var(--color-border-strong)] underline-offset-4 hover:decoration-[var(--color-ink)]'>
              Back to cart
            </Link>
          </div>
        </div>
      </header>

      <div className='min-h-[calc(100vh-65px)]'>
        <Outlet />
      </div>
    </div>
  );
}

export default CheckoutLayout;
