import { useEffect, useState } from 'react';

import { NavLink, useLocation, useNavigate } from 'react-router';

import { useSelector } from 'react-redux';

import { Button } from '../../ui/Button.jsx';
import { Drawer } from '../../ui/Drawer.jsx';

import { AppLogo } from '../AppLogo.jsx';

const desktopNavClass = ({ isActive }) =>
  [
    'relative py-2 text-sm font-semibold transition-colors',
    'after:absolute after:inset-x-0 after:-bottom-px after:h-[2px]',
    isActive
      ? 'text-[var(--color-ink)] after:bg-[var(--color-ink)]'
      : 'text-[var(--color-muted)] after:bg-transparent hover:text-[var(--color-ink)]',
  ].join(' ');

const mobileNavClass = ({ isActive }) =>
  [
    'block border-b border-[var(--color-border)] py-4 text-base font-semibold',
    isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)]',
  ].join(' ');

export function StorefrontHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = useSelector((state) => state.auth.user);

  const [searchValue, setSearchValue] = useState('');

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    setSearchValue(params.get('q') ?? '');
  }, [location.search]);

  const accountDestination =
    user?.role === 'admin'
      ? '/admin'
      : user?.role === 'customer'
        ? '/account'
        : '/auth/login';

  const accountLabel =
    user?.role === 'admin'
      ? 'Admin'
      : user?.role === 'customer'
        ? 'Account'
        : 'Sign in';

  function performSearch() {
    const q = searchValue.trim();

    if (!q) {
      navigate('/shop');

      return;
    }

    const params = new URLSearchParams();

    params.set('q', q);

    navigate(`/search?${params.toString()}`);
  }

  function handleSearchSubmit(event) {
    event.preventDefault();

    performSearch();
  }

  function handleMobileSearchSubmit(event) {
    event.preventDefault();

    setMobileOpen(false);

    performSearch();
  }

  function closeMobileNavigation() {
    setMobileOpen(false);
  }

  return (
    <>
      <header className='sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/95 backdrop-blur-[6px]'>
        <div className='ds-container'>
          <div className='flex min-h-16 items-center justify-between gap-6'>
            <AppLogo />

            <nav
              className='hidden self-stretch md:flex md:items-center md:gap-7'
              aria-label='Primary navigation'>
              <NavLink to='/shop' className={desktopNavClass}>
                Shop
              </NavLink>

              <NavLink to='/cart' className={desktopNavClass}>
                Cart
              </NavLink>

              <NavLink to={accountDestination} className={desktopNavClass}>
                {accountLabel}
              </NavLink>
            </nav>

            <form
              onSubmit={handleSearchSubmit}
              className='ml-auto hidden w-full max-w-[360px] lg:flex'>
              <label htmlFor='global-search' className='sr-only'>
                Search products
              </label>

              <input
                id='global-search'
                type='search'
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder='Search products or brands'
                className='min-h-10 min-w-0 flex-1 border border-r-0 border-[var(--color-border-strong)] bg-white px-3.5 text-sm outline-none transition focus:border-[var(--color-ink)]'
              />

              <Button type='submit' size='sm' className='rounded-l-none'>
                Search
              </Button>
            </form>

            <Button
              type='button'
              variant='secondary'
              size='sm'
              onClick={() => setMobileOpen(true)}
              className='md:hidden'
              aria-label='Open navigation'
              aria-expanded={mobileOpen}>
              Menu
            </Button>
          </div>
        </div>
      </header>

      <Drawer
        open={mobileOpen}
        onClose={closeMobileNavigation}
        title='Menu'
        description='Browse MultiSport'>
        <form onSubmit={handleMobileSearchSubmit} className='mb-6'>
          <label
            htmlFor='mobile-global-search'
            className='mb-2 block text-sm font-semibold'>
            Search products
          </label>

          <div className='flex'>
            <input
              id='mobile-global-search'
              type='search'
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder='Search products'
              className='min-h-11 min-w-0 flex-1 border border-r-0 border-[var(--color-border-strong)] px-3.5 text-sm outline-none focus:border-[var(--color-ink)]'
            />

            <Button type='submit' className='rounded-l-none'>
              Search
            </Button>
          </div>
        </form>

        <nav aria-label='Mobile navigation'>
          <NavLink
            to='/shop'
            className={mobileNavClass}
            onClick={closeMobileNavigation}>
            Shop
          </NavLink>

          <NavLink
            to='/cart'
            className={mobileNavClass}
            onClick={closeMobileNavigation}>
            Cart
          </NavLink>

          <NavLink
            to={accountDestination}
            className={mobileNavClass}
            onClick={closeMobileNavigation}>
            {accountLabel}
          </NavLink>
        </nav>
      </Drawer>
    </>
  );
}
