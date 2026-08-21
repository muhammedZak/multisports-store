import { Outlet } from 'react-router';

import { AppLogo } from '../components/shared/AppLogo.jsx';

function AuthLayout() {
  return (
    <main className='min-h-screen bg-white'>
      <div className='grid min-h-screen lg:grid-cols-[minmax(360px,0.9fr)_minmax(520px,1.1fr)]'>
        <section className='relative hidden overflow-hidden bg-[var(--color-ink)] px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-14 xl:py-12'>
          <AppLogo className='[&_span:last-child]:text-white' />

          <div className='relative max-w-xl'>
            <div
              aria-hidden='true'
              className='mb-8 h-1 w-16 bg-[var(--color-accent)]'
            />

            <p className='mb-4 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400'>
              Built for every game
            </p>

            <h1 className='mb-0 text-5xl font-black leading-[0.98] tracking-[-0.055em] xl:text-6xl'>
              Your sport.
              <br />
              Your gear.
              <br />
              One store.
            </h1>
          </div>

          <p className='mb-0 max-w-sm text-sm leading-6 text-neutral-400'>
            Equipment and apparel across football, cricket, basketball, tennis,
            badminton, running and fitness.
          </p>
        </section>

        <section className='flex min-h-screen flex-col'>
          <div className='border-b border-[var(--color-border)] px-6 py-5 lg:hidden'>
            <AppLogo />
          </div>

          <div className='flex flex-1 items-center justify-center px-6 py-12 sm:px-10 lg:px-14'>
            <div className='w-full max-w-md'>
              <Outlet />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default AuthLayout;
