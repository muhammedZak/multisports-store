import { useCallback, useEffect, useRef, useState } from 'react';

import { Link } from 'react-router';

import { useDispatch } from 'react-redux';

import {
  fetchMyProfile,
  removeMyProfilePhoto,
  updateMyProfile,
  uploadMyProfilePhoto,
} from '../../api/userApi.js';

import { normalizeApiError } from '../../api/errors.js';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AccountPageHeader } from '../../features/account/components/AccountPageHeader.jsx';
import { ProfileAvatar } from '../../features/account/components/ProfileAvatar.jsx';

import {
  validateProfileForm,
  validateProfilePhoto,
} from '../../features/account/account.utils.js';

import {
  updateAuthenticatedUserProfile,
  updateAuthenticatedUserProfilePhoto,
} from '../../features/auth/authSlice.js';

function EditProfilePage() {
  const dispatch = useDispatch();

  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
  });

  const [profilePhoto, setProfilePhoto] = useState(null);

  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const [pageLoading, setPageLoading] = useState(true);

  const [loadError, setLoadError] = useState(null);

  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState(null);

  const [successMessage, setSuccessMessage] = useState('');

  const [photoSaving, setPhotoSaving] = useState(false);

  const [photoError, setPhotoError] = useState(null);

  const [photoSuccessMessage, setPhotoSuccessMessage] = useState('');

  const busy = saving || photoSaving;

  const loadProfile = useCallback(async () => {
    setPageLoading(true);

    setLoadError(null);

    try {
      const user = await fetchMyProfile();

      setForm({
        name: user.name || '',

        phone: user.phone || '',
      });

      setProfilePhoto(user.profilePhoto ?? null);
    } catch (requestError) {
      setLoadError(
        normalizeApiError(
          requestError,
          'Unable to load your profile. Please try again.',
        ),
      );
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setFormError(null);

    setSuccessMessage('');
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0] ?? null;

    setPhotoError(null);

    setPhotoSuccessMessage('');

    if (!file) {
      setSelectedPhoto(null);

      return;
    }

    const validationError = validateProfilePhoto(file);

    if (validationError) {
      setSelectedPhoto(null);

      setPhotoError({
        code: 'INVALID_IMAGE',

        message: validationError,

        fields: {},
      });

      event.target.value = '';

      return;
    }

    setSelectedPhoto(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setFormError(null);

    setSuccessMessage('');

    const { fields, payload } = validateProfileForm(form);

    if (Object.keys(fields).length > 0) {
      setFormError({
        code: 'VALIDATION_ERROR',

        message: 'Please correct the invalid fields.',

        fields,
      });

      return;
    }

    setSaving(true);

    try {
      const updatedUser = await updateMyProfile(payload);

      setForm({
        name: updatedUser.name || '',

        phone: updatedUser.phone || '',
      });

      setProfilePhoto(updatedUser.profilePhoto ?? null);

      dispatch(
        updateAuthenticatedUserProfile({
          name: updatedUser.name,

          phone: updatedUser.phone,
        }),
      );

      setSuccessMessage('Your profile has been updated successfully.');
    } catch (requestError) {
      setFormError(
        normalizeApiError(
          requestError,
          'Unable to update your profile. Please try again.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload() {
    setPhotoError(null);

    setPhotoSuccessMessage('');

    const validationError = validateProfilePhoto(selectedPhoto);

    if (validationError) {
      setPhotoError({
        code: 'INVALID_IMAGE',

        message: validationError,

        fields: {},
      });

      return;
    }

    setPhotoSaving(true);

    try {
      const hadPhoto = Boolean(profilePhoto?.url);

      const updatedUser = await uploadMyProfilePhoto(selectedPhoto);

      setProfilePhoto(updatedUser.profilePhoto ?? null);

      setSelectedPhoto(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      dispatch(
        updateAuthenticatedUserProfilePhoto({
          profilePhoto: updatedUser.profilePhoto ?? null,
        }),
      );

      setPhotoSuccessMessage(
        hadPhoto
          ? 'Your profile photo has been replaced.'
          : 'Your profile photo has been uploaded.',
      );
    } catch (requestError) {
      setPhotoError(
        normalizeApiError(
          requestError,
          'Unable to upload your profile photo. Please try again.',
        ),
      );
    } finally {
      setPhotoSaving(false);
    }
  }

  async function handlePhotoRemove() {
    setPhotoError(null);

    setPhotoSuccessMessage('');

    setPhotoSaving(true);

    try {
      await removeMyProfilePhoto();

      setProfilePhoto(null);

      setSelectedPhoto(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      dispatch(
        updateAuthenticatedUserProfilePhoto({
          profilePhoto: null,
        }),
      );

      setPhotoSuccessMessage('Your profile photo has been removed.');
    } catch (requestError) {
      setPhotoError(
        normalizeApiError(
          requestError,
          'Unable to remove your profile photo. Please try again.',
        ),
      );
    } finally {
      setPhotoSaving(false);
    }
  }

  if (pageLoading) {
    return (
      <div className='max-w-2xl'>
        <Skeleton className='h-8 w-48' />

        <Skeleton className='mt-8 h-36 w-full' />

        <Skeleton className='mt-8 h-48 w-full' />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className='max-w-2xl'>
        <AccountPageHeader
          title='Edit profile'
          backTo='/account'
          backLabel='Profile'
        />

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
          {loadError.message}
        </Alert>
      </div>
    );
  }

  return (
    <div className='max-w-2xl'>
      <AccountPageHeader
        title='Edit profile'
        description='Update your profile photo, display name and phone number.'
        backTo='/account'
        backLabel='Profile'
      />

      <section className='mt-8 border-y border-[var(--color-border)] py-6'>
        <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
          Profile image
        </p>

        <h2 className='mb-0 text-lg font-black tracking-[-0.02em]'>
          Profile photo
        </h2>

        <p className='mt-2 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
          Upload a JPEG, PNG or WebP image up to 5 MB.
        </p>

        <div className='mt-5 flex flex-col gap-5 sm:flex-row sm:items-center'>
          <ProfileAvatar
            name={form.name}
            profilePhoto={profilePhoto}
            size='xl'
          />

          <div className='min-w-0 flex-1'>
            <label
              htmlFor='profile-photo'
              className='mb-2 block text-sm font-semibold'>
              {profilePhoto?.url ? 'Choose replacement image' : 'Choose image'}
            </label>

            <input
              ref={fileInputRef}
              id='profile-photo'
              type='file'
              accept='image/jpeg,image/png,image/webp'
              disabled={busy}
              onChange={handlePhotoChange}
              className='block w-full text-sm text-[var(--color-muted)] file:mr-4 file:border file:border-[var(--color-border-strong)] file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:border-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50'
            />

            {selectedPhoto ? (
              <p className='mt-2 mb-0 text-xs text-[var(--color-muted)]'>
                Selected: {selectedPhoto.name}
              </p>
            ) : null}
          </div>
        </div>

        {photoError ? (
          <Alert variant='danger' className='mt-4'>
            {photoError.message}
          </Alert>
        ) : null}

        {photoSuccessMessage ? (
          <Alert variant='success' className='mt-4'>
            {photoSuccessMessage}
          </Alert>
        ) : null}

        <div className='mt-5 flex flex-wrap gap-3'>
          <Button
            type='button'
            disabled={busy || !selectedPhoto}
            onClick={handlePhotoUpload}>
            {photoSaving && selectedPhoto
              ? 'Uploading...'
              : profilePhoto?.url
                ? 'Replace photo'
                : 'Upload photo'}
          </Button>

          {profilePhoto?.url ? (
            <Button
              type='button'
              variant='secondary'
              disabled={busy}
              onClick={handlePhotoRemove}
              className='text-[var(--color-danger)]'>
              {photoSaving && !selectedPhoto ? 'Removing...' : 'Remove photo'}
            </Button>
          ) : null}
        </div>
      </section>

      <form onSubmit={handleSubmit} className='mt-8 space-y-5'>
        <div>
          <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
            Personal information
          </p>

          <h2 className='mb-0 text-lg font-black tracking-[-0.02em]'>
            Profile details
          </h2>
        </div>

        <Input
          id='profile-name'
          name='name'
          label='Name'
          type='text'
          autoComplete='name'
          required
          value={form.name}
          disabled={busy}
          error={formError?.fields?.name}
          onChange={handleChange}
        />

        <Input
          id='profile-phone'
          name='phone'
          label='Phone number'
          type='tel'
          autoComplete='tel'
          placeholder='+91 98765 43210'
          value={form.phone}
          disabled={busy}
          hint='Phone number is optional. Clear the field and save to remove it.'
          error={formError?.fields?.phone}
          onChange={handleChange}
        />

        {formError?.fields?.request ? (
          <Alert variant='danger'>{formError.fields.request}</Alert>
        ) : null}

        {formError && Object.keys(formError.fields || {}).length === 0 ? (
          <Alert variant='danger'>{formError.message}</Alert>
        ) : null}

        {successMessage ? (
          <Alert variant='success'>{successMessage}</Alert>
        ) : null}

        <div className='flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-5'>
          <Button type='submit' disabled={busy}>
            {saving ? 'Saving changes...' : 'Save changes'}
          </Button>

          <Link
            to='/account'
            className='inline-flex min-h-10 items-center border border-[var(--color-border-strong)] bg-white px-4 text-sm font-semibold hover:border-[var(--color-ink)]'>
            Cancel
          </Link>
        </div>
      </form>

      <section className='mt-10 border-t border-[var(--color-border)] pt-6'>
        <h2 className='mb-0 text-base font-black'>Authentication email</h2>

        <p className='mt-2 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
          Your sign-in email cannot be changed from this profile form.
        </p>

        <Link
          to='/account/security/email'
          className='mt-3 inline-flex text-sm font-semibold underline underline-offset-4'>
          Change authentication email
        </Link>
      </section>
    </div>
  );
}

export default EditProfilePage;
