import { Navigate, Outlet, useLocation } from 'react-router';

import { useSelector } from 'react-redux';

function RequireCustomer() {
  const location = useLocation();

  const { initialized, user } = useSelector((state) => state.auth);

  if (!initialized) {
    return (
      <div className='grid min-h-screen place-items-center'>
        <p>Checking your session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to='/auth/login'
        replace
        state={{
          from: location.pathname + location.search,
        }}
      />
    );
  }

  if (user.role !== 'customer') {
    return (
      <main className='grid min-h-screen place-items-center p-6'>
        <div>
          <h1 className='text-2xl font-semibold'>Access denied</h1>

          <p className='mt-2 text-gray-600'>This page is for customers.</p>
        </div>
      </main>
    );
  }

  return <Outlet />;
}

export default RequireCustomer;
