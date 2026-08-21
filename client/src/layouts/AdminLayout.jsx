import { useState } from 'react';

import { Outlet } from 'react-router';

import { useDispatch, useSelector } from 'react-redux';

import { Button } from '../components/ui/Button.jsx';
import { Drawer } from '../components/ui/Drawer.jsx';

import { AppLogo } from '../components/shared/AppLogo.jsx';

import { AdminNavigation } from '../components/shared/navigation/AdminNavigation.jsx';

import { logout } from '../features/auth/authSlice.js';

function AdminLayout() {
  const dispatch = useDispatch();

  const { user, actionStatus } = useSelector((state) => state.auth);

  const [mobileOpen, setMobileOpen] = useState(false);

  const loggingOut = actionStatus === 'loading';

  async function handleLogout() {
    await dispatch(logout());
  }

  return (
    <div className='min-h-screen bg-white text-[var(--color-ink)]'>
      <header className='sticky top-0 z-40 border-b border-[var(--color-border)] bg-white'>
        <div className='ds-container flex min-h-[68px] items-center justify-between gap-6'>
          <div className='flex items-center gap-5'>
            <AppLogo />

            <div className='hidden h-6 w-px bg-[var(--color-border)] sm:block' />

            <p className='mb-0 hidden text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)] sm:block'>
              Admin
            </p>
          </div>

          <div className='flex items-center gap-3'>
            <div className='hidden text-right md:block'>
              <p className='mb-0 text-sm font-semibold'>{user?.name}</p>

              <p className='mb-0 text-xs text-[var(--color-muted)]'>
                {user?.email}
              </p>
            </div>

            <Button
              type='button'
              variant='secondary'
              size='sm'
              onClick={() => setMobileOpen(true)}
              className='lg:hidden'>
              Menu
            </Button>

            <Button
              type='button'
              variant='quiet'
              size='sm'
              disabled={loggingOut}
              onClick={handleLogout}
              className='hidden lg:inline-flex'>
              {loggingOut ? 'Logging out...' : 'Log out'}
            </Button>
          </div>
        </div>
      </header>

      <div className='ds-container py-6 lg:py-8'>
        <div className='grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)] xl:gap-10'>
          <aside className='hidden lg:block'>
            <div className='sticky top-24 border-r border-[var(--color-border)] pr-6'>
              <AdminNavigation />
            </div>
          </aside>

          <main className='min-w-0'>
            <Outlet />
          </main>
        </div>
      </div>

      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title='Admin'
        description='MultiSport management'
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
        <AdminNavigation onNavigate={() => setMobileOpen(false)} />
      </Drawer>
    </div>
  );
}

export default AdminLayout;
