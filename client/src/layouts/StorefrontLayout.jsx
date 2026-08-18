import { useEffect, useState } from 'react';

import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useSearchParams,
} from 'react-router';

function StorefrontLayout() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    setSearchValue(searchParams.get('q') ?? '');
  }, [searchParams]);

  function handleSearchSubmit(event) {
    event.preventDefault();

    const q = searchValue.trim();

    if (!q) {
      navigate('/shop');

      return;
    }

    const params = new URLSearchParams();

    params.set('q', q);

    navigate(`/search?${params.toString()}`);
  }

  return (
    <div className='min-h-screen bg-white text-neutral-950'>
      <header className='border-b border-neutral-200'>
        <div className='mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-8'>
          <div className='flex items-center justify-between gap-6'>
            <Link to='/shop' className='text-xl font-black tracking-tight'>
              MULTISPORT
            </Link>

            <nav className='flex items-center gap-5 text-sm font-medium'>
              <NavLink
                to='/shop'
                className={({ isActive }) =>
                  isActive
                    ? 'border-b border-black pb-1'
                    : 'pb-1 text-neutral-600 hover:text-black'
                }>
                Shop
              </NavLink>

              <NavLink
                to='/cart'
                className={({ isActive }) =>
                  isActive
                    ? 'border-b border-black pb-1'
                    : 'pb-1 text-neutral-600 hover:text-black'
                }>
                Cart
              </NavLink>

              <Link to='/account' className='text-neutral-600 hover:text-black'>
                Account
              </Link>
            </nav>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className='flex w-full gap-2 md:max-w-md'>
            <label htmlFor='global-search' className='sr-only'>
              Search products
            </label>

            <input
              id='global-search'
              type='search'
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder='Search products or brands'
              className='min-w-0 flex-1 border border-neutral-300 px-4 py-2.5 text-sm outline-none transition focus:border-black'
            />

            <button
              type='submit'
              className='bg-black px-5 py-2.5 text-sm font-medium text-white'>
              Search
            </button>
          </form>
        </div>
      </header>

      <Outlet />

      <footer className='mt-16 border-t border-neutral-200'>
        <div className='mx-auto max-w-7xl px-5 py-8 text-sm text-neutral-500 lg:px-8'>
          MultiSports Store
        </div>
      </footer>
    </div>
  );
}

export default StorefrontLayout;
