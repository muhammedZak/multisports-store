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
    return <Navigate to='/account' replace />;
  }

  return <Outlet />;
}

export default RequireGuest;
