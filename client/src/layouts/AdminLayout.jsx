import { NavLink, Outlet } from 'react-router';

import { useDispatch, useSelector } from 'react-redux';

import { logout } from '../features/auth/authSlice.js';

function AdminLayout() {
  const dispatch = useDispatch();

  const { user, actionStatus } = useSelector((state) => state.auth);

  const loggingOut = actionStatus === 'loading';

  async function handleLogout() {
    await dispatch(logout());
  }

  return (
    <div className='min-h-screen bg-neutral-50'>
      <header className='border-b border-neutral-200 bg-white'>
        <div className='mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-6'>
          <div>
            <p className='text-xs font-medium uppercase tracking-[0.2em] text-neutral-500'>
              MultiSports Store
            </p>

            <p className='mt-1 font-semibold'>Admin</p>
          </div>

          <div className='flex items-center gap-4'>
            <div className='hidden text-right sm:block'>
              <p className='text-sm font-medium'>{user?.name}</p>

              <p className='text-xs text-neutral-500'>{user?.email}</p>
            </div>

            <button
              type='button'
              disabled={loggingOut}
              onClick={handleLogout}
              className='border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50'>
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <div className='mx-auto grid max-w-7xl gap-6 p-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:p-6'>
        <aside className='border border-neutral-200 bg-white p-4'>
          <p className='mb-3 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500'>
            Management
          </p>

          <nav className='space-y-1'>
            <NavLink
              to='/admin'
              end
              className={({ isActive }) =>
                [
                  'block px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-black text-white'
                    : 'text-neutral-700 hover:bg-neutral-100',
                ].join(' ')
              }>
              Dashboard
            </NavLink>

            <NavLink
              to='/admin/analytics'
              className={({ isActive }) =>
                [
                  'block px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-black text-white'
                    : 'text-neutral-700 hover:bg-neutral-100',
                ].join(' ')
              }>
              Analytics
            </NavLink>

            <NavLink
              to='/admin/products'
              className={({ isActive }) =>
                [
                  'block px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-black text-white'
                    : 'text-neutral-700 hover:bg-neutral-100',
                ].join(' ')
              }>
              Products
            </NavLink>

            <NavLink
              to='/admin/categories'
              className={({ isActive }) =>
                [
                  'block px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-black text-white'
                    : 'text-neutral-700 hover:bg-neutral-100',
                ].join(' ')
              }>
              Categories
            </NavLink>
            <NavLink
              to='/admin/inventory'
              className={({ isActive }) =>
                [
                  'block px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-black text-white'
                    : 'text-neutral-700 hover:bg-neutral-100',
                ].join(' ')
              }>
              Inventory
            </NavLink>

            <NavLink
              to='/admin/coupons'
              className={({ isActive }) =>
                [
                  'block px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-black text-white'
                    : 'text-neutral-700 hover:bg-neutral-100',
                ].join(' ')
              }>
              Coupons
            </NavLink>

            <NavLink
              to='/admin/orders'
              className={({ isActive }) =>
                [
                  'block px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-black text-white'
                    : 'text-neutral-700 hover:bg-neutral-100',
                ].join(' ')
              }>
              Orders
            </NavLink>

            <NavLink
              to='/admin/reviews'
              className={({ isActive }) =>
                [
                  'block px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-black text-white'
                    : 'text-neutral-700 hover:bg-neutral-100',
                ].join(' ')
              }>
              Reviews
            </NavLink>

            <NavLink
              to='/admin/refunds'
              className={({ isActive }) =>
                [
                  'block px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-black text-white'
                    : 'text-neutral-700 hover:bg-neutral-100',
                ].join(' ')
              }>
              Refunds
            </NavLink>

            <NavLink
              to='/admin/notifications'
              className={({ isActive }) =>
                [
                  'block px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-black text-white'
                    : 'text-neutral-700 hover:bg-neutral-100',
                ].join(' ')
              }>
              Notifications
            </NavLink>

            <NavLink
              to='/admin/support'
              className={({ isActive }) =>
                [
                  'block px-3 py-2 text-sm font-medium transition',

                  isActive
                    ? 'bg-black text-white'
                    : 'text-neutral-700 hover:bg-neutral-100',
                ].join(' ')
              }>
              Support
            </NavLink>
          </nav>
        </aside>

        <div className='min-w-0 border border-neutral-200 bg-white'>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
