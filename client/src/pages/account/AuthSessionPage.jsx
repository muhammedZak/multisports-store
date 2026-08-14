import { useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import GoogleSignInButton from '../../features/auth/GoogleSignInButton.jsx';

import {
  clearGoogleLinkPending,
  logout,
  signInWithGoogle,
} from '../../features/auth/authSlice.js';

function AuthSessionPage() {
  const dispatch = useDispatch();

  const { user, actionStatus, error, googleLinkPending } = useSelector(
    (state) => state.auth,
  );

  const [googleMessage, setGoogleMessage] = useState('');

  const loading = actionStatus === 'loading';

  async function handleGoogleCredential(credential) {
    setGoogleMessage('');

    const result = await dispatch(
      signInWithGoogle({
        credential,
      }),
    );

    if (signInWithGoogle.fulfilled.match(result)) {
      setGoogleMessage('Google has been linked to your existing account.');
    }
  }

  return (
    <main className='mx-auto max-w-3xl p-6'>
      <h1 className='text-3xl font-semibold'>Authentication complete</h1>

      {googleLinkPending && (
        <section className='mt-8 border border-amber-200 bg-amber-50 p-6'>
          <h2 className='text-lg font-semibold'>Finish linking Google</h2>

          <p className='mt-2 text-sm leading-6 text-neutral-700'>
            You have successfully proved ownership of this account. Continue
            with the same Google account to finish linking it.
          </p>

          <div className='mt-5'>
            <GoogleSignInButton
              disabled={loading}
              onCredential={handleGoogleCredential}
            />
          </div>

          <button
            type='button'
            disabled={loading}
            onClick={() => dispatch(clearGoogleLinkPending())}
            className='mt-4 text-sm font-medium underline underline-offset-4 disabled:opacity-50'>
            Not now
          </button>
        </section>
      )}

      {googleMessage && (
        <div
          role='status'
          className='mt-6 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
          {googleMessage}
        </div>
      )}

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

        {error && error.code !== 'ACCOUNT_LINK_REQUIRED' && (
          <p className='mt-4 text-red-600'>{error.message}</p>
        )}
      </div>
    </main>
  );
}

export default AuthSessionPage;
