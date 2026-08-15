import { useCallback, useEffect, useState } from 'react';

import { Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';

import { fetchMyProfile } from '../../api/userApi.js';
import { normalizeApiError } from '../../api/errors.js';

import GoogleSignInButton from '../../features/auth/GoogleSignInButton.jsx';

import {
  clearGoogleLinkPending,
  logout,
  signInWithGoogle,
} from '../../features/auth/authSlice.js';

function ProfilePage() {
  const dispatch = useDispatch();

  const {
    actionStatus,
    error: authError,
    googleLinkPending,
  } = useSelector((state) => state.auth);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  const [googleMessage, setGoogleMessage] = useState('');

  const authActionLoading = actionStatus === 'loading';

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);

    try {
      const user = await fetchMyProfile();

      setProfile(user);
    } catch (requestError) {
      setProfileError(
        normalizeApiError(
          requestError,
          'Unable to load your profile. Please try again.',
        ),
      );
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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

  async function handleLogout() {
    await dispatch(logout());
  }

  return (
    <main className='mx-auto max-w-3xl p-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
            My account
          </p>

          <h1 className='mt-3 text-3xl font-semibold'>Profile</h1>

          <p className='mt-2 text-sm leading-6 text-neutral-600'>
            View and manage your personal account information.
          </p>
        </div>

        <Link
          to='/account/profile/edit'
          className='inline-flex bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800'>
          Edit profile
        </Link>
      </div>

      {googleLinkPending && (
        <section className='mt-8 border border-amber-200 bg-amber-50 p-6'>
          <h2 className='text-lg font-semibold'>Finish linking Google</h2>

          <p className='mt-2 text-sm leading-6 text-neutral-700'>
            You have successfully proved ownership of this account. Continue
            with the same Google account to finish linking it.
          </p>

          <div className='mt-5'>
            <GoogleSignInButton
              disabled={authActionLoading}
              onCredential={handleGoogleCredential}
            />
          </div>

          <button
            type='button'
            disabled={authActionLoading}
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

      {authError && authError.code !== 'ACCOUNT_LINK_REQUIRED' && (
        <div
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {authError.message}
        </div>
      )}

      {profileLoading && (
        <section className='mt-8 border border-neutral-200 p-6'>
          <p className='text-sm text-neutral-600'>Loading profile...</p>
        </section>
      )}

      {!profileLoading && profileError && (
        <section className='mt-8 border border-red-200 bg-red-50 p-6'>
          <p role='alert' className='text-sm text-red-700'>
            {profileError.message}
          </p>

          <button
            type='button'
            onClick={loadProfile}
            className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
            Try again
          </button>
        </section>
      )}

      {!profileLoading && !profileError && profile && (
        <section className='mt-8 border border-neutral-200'>
          <div className='border-b border-neutral-200 p-5'>
            <p className='text-xs font-medium uppercase tracking-wide text-neutral-500'>
              Profile photo
            </p>

            <div className='mt-4 flex items-center gap-4'>
              {profile.profilePhoto?.url ? (
                <img
                  src={profile.profilePhoto.url}
                  alt={`${profile.name} profile`}
                  className='h-20 w-20 rounded-full border border-neutral-200 object-cover'
                />
              ) : (
                <div
                  aria-hidden='true'
                  className='flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 text-2xl font-semibold text-neutral-500'>
                  {profile.name?.trim()?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}

              <div>
                <p className='text-sm font-medium'>
                  {profile.profilePhoto?.url
                    ? 'Profile photo added'
                    : 'No profile photo'}
                </p>

                <p className='mt-1 text-xs leading-5 text-neutral-500'>
                  Use Edit profile to upload, replace, or remove your photo.
                </p>
              </div>
            </div>
          </div>

          <div className='border-b border-neutral-200 p-5'>
            <p className='text-xs font-medium uppercase tracking-wide text-neutral-500'>
              Name
            </p>

            <p className='mt-2 font-medium'>{profile.name}</p>
          </div>

          <div className='border-b border-neutral-200 p-5'>
            <p className='text-xs font-medium uppercase tracking-wide text-neutral-500'>
              Email
            </p>

            <div className='mt-2 flex flex-wrap items-center gap-3'>
              <p className='font-medium'>{profile.email}</p>

              {profile.emailVerified ? (
                <span className='bg-green-50 px-2 py-1 text-xs font-medium text-green-700'>
                  Verified
                </span>
              ) : (
                <span className='bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700'>
                  Not verified
                </span>
              )}
            </div>

            <p className='mt-2 text-xs leading-5 text-neutral-500'>
              Authentication email is managed separately from profile editing.
            </p>
          </div>

          <div className='border-b border-neutral-200 p-5'>
            <p className='text-xs font-medium uppercase tracking-wide text-neutral-500'>
              Phone
            </p>

            <p className='mt-2 font-medium'>
              {profile.phone || 'No phone number added'}
            </p>
          </div>

          <div className='p-5'>
            <p className='text-xs font-medium uppercase tracking-wide text-neutral-500'>
              Account type
            </p>

            <p className='mt-2 font-medium capitalize'>{profile.role}</p>
          </div>
        </section>
      )}

      <section className='mt-8 border border-neutral-200 p-5'>
        <h2 className='font-semibold'>Saved addresses</h2>

        <p className='mt-2 text-sm leading-6 text-neutral-600'>
          Add and manage shipping addresses for future checkout use.
        </p>

        <Link
          to='/account/addresses'
          className='mt-4 inline-block text-sm font-medium underline underline-offset-4'>
          Manage addresses
        </Link>
      </section>

      <section className='mt-8 border border-neutral-200 p-5'>
        <h2 className='font-semibold'>Account security</h2>

        <p className='mt-2 text-sm leading-6 text-neutral-600'>
          Manage your password and authentication email from Security.
        </p>

        <Link
          to='/account/security'
          className='mt-4 inline-block text-sm font-medium underline underline-offset-4'>
          Security settings
        </Link>
      </section>

      <button
        type='button'
        disabled={authActionLoading}
        onClick={handleLogout}
        className='mt-8 border border-neutral-300 px-5 py-3 text-sm font-medium transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50'>
        {authActionLoading ? 'Logging out...' : 'Logout'}
      </button>
    </main>
  );
}

export default ProfilePage;
