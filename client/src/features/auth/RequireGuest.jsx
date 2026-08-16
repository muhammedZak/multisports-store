import { Navigate, Outlet } from 'react-router';

import { useSelector } from 'react-redux';

function RequireGuest() {
  const { initialized, user } = useSelector((state) => state.auth);

  if (!initialized) {
    return (
      <div className='grid min-h-screen place-items-center'>
        <p>Checking your session...</p>
      </div>
    );
  }

  if (user) {
    const destination =
      user.role === 'admin' ? '/admin/categories' : '/account';

    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}

export default RequireGuest;
