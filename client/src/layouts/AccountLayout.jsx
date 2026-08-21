import { useState } from 'react';

import { Outlet } from 'react-router';

import { useDispatch, useSelector } from 'react-redux';

import { Button } from '../components/ui/Button.jsx';
import { Drawer } from '../components/ui/Drawer.jsx';

import { ShellFooter } from '../components/shared/ShellFooter.jsx';

import { AccountNavigation } from '../components/shared/navigation/AccountNavigation.jsx';

import { StorefrontHeader } from '../components/shared/navigation/StorefrontHeader.jsx';

import { logout } from '../features/auth/authSlice.js';

function AccountLayout() {
  const dispatch = useDispatch();

  const { user, actionStatus } = useSelector((state) => state.auth);

  const [mobileOpen, setMobileOpen] = useState(false);

  const loggingOut = actionStatus === 'loading';

  async function handleLogout() {
    await dispatch(logout());
  }

  return (
    <div className='flex min-h-screen flex-col bg-white'>
      <StorefrontHeader />

      <div className='flex-1'>
        <div className='ds-container py-8 lg:py-12'>
          <header className='mb-8 border-b border-[var(--color-border)] pb-6 lg:mb-10'>
            <div className='flex items-end justify-between gap-6'>
              <div>
                <p className='mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted)]'>
                  Account
                </p>

                <h1 className='mb-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl'>
                  {user?.name ?? 'My account'}
                </h1>

                <p className='mb-0 text-sm text-[var(--color-muted)]'>
                  {user?.email}
                </p>
              </div>

              <Button
                type='button'
                variant='secondary'
                size='sm'
                onClick={() => setMobileOpen(true)}
                className='lg:hidden'>
                Account menu
              </Button>
            </div>
          </header>

          <div className='grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] xl:gap-14'>
            <aside className='hidden border-r border-[var(--color-border)] pr-6 lg:block'>
              <AccountNavigation />

              <div className='mt-8 border-t border-[var(--color-border)] pt-5'>
                <Button
                  type='button'
                  variant='quiet'
                  size='sm'
                  disabled={loggingOut}
                  onClick={handleLogout}
                  className='w-full justify-start'>
                  {loggingOut ? 'Logging out...' : 'Log out'}
                </Button>
              </div>
            </aside>

            <div className='min-w-0'>
              <Outlet />
            </div>
          </div>
        </div>
      </div>

      <ShellFooter />

      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title='My account'
        description={user?.email}
        footer={
          <Button
            type='button'
            variant='secondary'
            disabled={loggingOut}
            onClick={handleLogout}
            className='w-full'>
            {loggingOut ? 'Logging out...' : 'Log out'}
          </Button>
        }>
        <AccountNavigation onNavigate={() => setMobileOpen(false)} />
      </Drawer>
    </div>
  );
}

export default AccountLayout;
