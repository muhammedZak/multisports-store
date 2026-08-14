import { useDispatch, useSelector } from 'react-redux';

import { logout } from '../../features/auth/authSlice.js';

function AuthSessionPage() {
  const dispatch = useDispatch();

  const { user, actionStatus, error } = useSelector((state) => state.auth);

  const loading = actionStatus === 'loading';

  return (
    <main className='mx-auto max-w-3xl p-6'>
      <h1 className='text-3xl font-semibold'>Authentication complete</h1>

      <div className='mt-8 border p-6'>
        <p>
          <strong>Name:</strong> {user.name}
        </p>

        <p>
          <strong>Email:</strong> {user.email}
        </p>

        <p>
          <strong>Role:</strong> {user.role}
        </p>

        <button
          type='button'
          disabled={loading}
          onClick={() => dispatch(logout())}
          className='mt-6 bg-black px-5 py-3 text-white disabled:opacity-50'>
          {loading ? 'Logging out...' : 'Logout'}
        </button>

        {error && <p className='mt-4 text-red-600'>{error.message}</p>}
      </div>
    </main>
  );
}

export default AuthSessionPage;
