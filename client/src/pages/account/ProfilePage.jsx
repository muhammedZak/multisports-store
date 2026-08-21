import { useCallback, useEffect, useState } from 'react';

import { Link } from 'react-router';

import { useDispatch, useSelector } from 'react-redux';

import { fetchMyProfile } from '../../api/userApi.js';

import { normalizeApiError } from '../../api/errors.js';

import { Alert } from '../../components/ui/Alert.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AccountPageHeader } from '../../features/account/components/AccountPageHeader.jsx';
import { ProfileAvatar } from '../../features/account/components/ProfileAvatar.jsx';

import GoogleSignInButton from '../../features/auth/GoogleSignInButton.jsx';

import {
  clearGoogleLinkPending,
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

  return (
    <div className='max-w-3xl'>
      <AccountPageHeader
        title='Profile'
        description='View and manage the personal information connected to your Customer account.'
        action={
          <Link
            to='/account/profile/edit'
            className='inline-flex min-h-10 items-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-4 text-sm font-bold text-white transition hover:bg-[#2b2b2b]'>
            Edit profile
          </Link>
        }
      />

      {googleLinkPending ? (
        <Alert variant='warning' title='Finish linking Google' className='mt-6'>
          <p className='mb-4'>
            You successfully proved ownership of this account. Continue with the
            same Google account to finish linking it.
          </p>

          <GoogleSignInButton
            disabled={authActionLoading}
            onCredential={handleGoogleCredential}
          />

          <Button
            type='button'
            variant='quiet'
            size='sm'
            disabled={authActionLoading}
            onClick={() => dispatch(clearGoogleLinkPending())}
            className='mt-3'>
            Not now
          </Button>
        </Alert>
      ) : null}

      {googleMessage ? (
        <Alert variant='success' className='mt-6'>
          {googleMessage}
        </Alert>
      ) : null}

      {authError && authError.code !== 'ACCOUNT_LINK_REQUIRED' ? (
        <Alert variant='danger' className='mt-6'>
          {authError.message}
        </Alert>
      ) : null}

      {profileLoading ? (
        <div className='mt-8'>
          <div className='flex items-center gap-5 border-y border-[var(--color-border)] py-6'>
            <Skeleton className='size-20 rounded-full' />

            <div className='flex-1'>
              <Skeleton className='h-5 w-40' />

              <Skeleton className='mt-3 h-4 w-56' />
            </div>
          </div>

          <Skeleton className='mt-6 h-24 w-full' />
        </div>
      ) : null}

      {!profileLoading && profileError ? (
        <Alert
          variant='danger'
          title='Unable to load profile'
          className='mt-6'
          actions={
            <Button
              type='button'
              variant='secondary'
              size='sm'
              onClick={loadProfile}>
              Try again
            </Button>
          }>
          {profileError.message}
        </Alert>
      ) : null}

      {!profileLoading && !profileError && profile ? (
        <>
          <section className='mt-8 flex items-center gap-5 border-y border-[var(--color-border)] py-6'>
            <ProfileAvatar
              name={profile.name}
              profilePhoto={profile.profilePhoto}
            />

            <div>
              <h2 className='mb-1 text-xl font-black tracking-[-0.025em]'>
                {profile.name}
              </h2>

              <p className='mb-0 text-sm text-[var(--color-muted)]'>
                {profile.email}
              </p>

              <p className='mt-2 mb-0 text-xs text-[var(--color-muted)]'>
                Profile photo, display name and phone can be changed from Edit
                profile.
              </p>
            </div>
          </section>

          <dl className='border-b border-[var(--color-border)]'>
            <div className='grid gap-2 border-b border-[var(--color-border)] py-5 sm:grid-cols-[180px_minmax(0,1fr)]'>
              <dt className='text-sm font-semibold text-[var(--color-muted)]'>
                Name
              </dt>

              <dd className='m-0 font-semibold'>{profile.name}</dd>
            </div>

            <div className='grid gap-2 border-b border-[var(--color-border)] py-5 sm:grid-cols-[180px_minmax(0,1fr)]'>
              <dt className='text-sm font-semibold text-[var(--color-muted)]'>
                Authentication email
              </dt>

              <dd className='m-0'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='font-semibold'>{profile.email}</span>

                  <Badge
                    variant={profile.emailVerified ? 'success' : 'warning'}>
                    {profile.emailVerified ? 'Verified' : 'Not verified'}
                  </Badge>
                </div>

                <p className='mt-2 mb-0 text-xs leading-5 text-[var(--color-muted)]'>
                  Authentication email is managed separately from profile
                  editing.
                </p>
              </dd>
            </div>

            <div className='grid gap-2 border-b border-[var(--color-border)] py-5 sm:grid-cols-[180px_minmax(0,1fr)]'>
              <dt className='text-sm font-semibold text-[var(--color-muted)]'>
                Phone
              </dt>

              <dd className='m-0 font-semibold'>
                {profile.phone || 'No phone number added'}
              </dd>
            </div>

            <div className='grid gap-2 py-5 sm:grid-cols-[180px_minmax(0,1fr)]'>
              <dt className='text-sm font-semibold text-[var(--color-muted)]'>
                Account type
              </dt>

              <dd className='m-0 capitalize font-semibold'>{profile.role}</dd>
            </div>
          </dl>
        </>
      ) : null}
    </div>
  );
}

export default ProfilePage;
