import { useCallback, useEffect, useRef, useState } from 'react';

import { Link } from 'react-router';
import { useDispatch } from 'react-redux';

import {
  fetchMyProfile,
  updateMyProfile,
  uploadMyProfilePhoto,
  removeMyProfilePhoto,
} from '../../api/userApi.js';

import { normalizeApiError } from '../../api/errors.js';

import {
  updateAuthenticatedUserProfile,
  updateAuthenticatedUserProfilePhoto,
} from '../../features/auth/authSlice.js';

const PHONE_ALLOWED_REGEX = /^\+?[0-9\s()-]+$/;

const PROFILE_PHOTO_MAX_SIZE = 5 * 1024 * 1024;

const ALLOWED_PROFILE_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function isValidPhone(phone) {
  const digitCount = phone.replace(/\D/g, '').length;

  return (
    phone.length <= 25 &&
    PHONE_ALLOWED_REGEX.test(phone) &&
    digitCount >= 7 &&
    digitCount <= 15
  );
}

function validateProfilePhoto(file) {
  if (!file) {
    return 'Select an image first.';
  }

  if (!ALLOWED_PROFILE_PHOTO_TYPES.has(file.type)) {
    return 'Only JPEG, PNG, and WebP images are allowed.';
  }

  if (file.size > PROFILE_PHOTO_MAX_SIZE) {
    return 'Profile photo must be 5 MB or smaller.';
  }

  return null;
}

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
  const [saving, setSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);

  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [photoError, setPhotoError] = useState(null);
  const [photoSuccessMessage, setPhotoSuccessMessage] = useState('');

  const busy = saving || photoSaving;

  const loadProfile = useCallback(async () => {
    setPageLoading(true);
    setError(null);
    setPhotoError(null);

    try {
      const user = await fetchMyProfile();

      setForm({
        name: user.name || '',
        phone: user.phone || '',
      });

      setProfilePhoto(user.profilePhoto ?? null);
    } catch (requestError) {
      setError(
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

    setError(null);
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

  function validateForm() {
    const fields = {};

    const name = form.name.trim();
    const phone = form.phone.trim();

    if (!name) {
      fields.name = 'Name is required.';
    }

    if (phone && !isValidPhone(phone)) {
      fields.phone = 'Enter a valid phone number.';
    }

    if (Object.keys(fields).length > 0) {
      setError({
        code: 'VALIDATION_ERROR',
        message: 'Please correct the invalid fields.',
        fields,
      });

      return null;
    }

    return {
      name,
      phone: phone || null,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError(null);
    setSuccessMessage('');

    const payload = validateForm();

    if (!payload) {
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
      setError(
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
        profilePhoto?.url
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
      <main className='mx-auto max-w-2xl p-6'>
        <p className='text-sm text-neutral-600'>Loading profile...</p>
      </main>
    );
  }

  if (error && !form.name && Object.keys(error.fields || {}).length === 0) {
    return (
      <main className='mx-auto max-w-2xl p-6'>
        <Link
          to='/account'
          className='text-sm font-medium underline underline-offset-4'>
          Back to profile
        </Link>

        <div className='mt-8 border border-red-200 bg-red-50 p-5'>
          <p role='alert' className='text-sm text-red-700'>
            {error.message}
          </p>

          <button
            type='button'
            onClick={loadProfile}
            className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className='mx-auto max-w-2xl p-6'>
      <Link
        to='/account'
        className='text-sm font-medium underline underline-offset-4'>
        Back to profile
      </Link>

      <div className='mt-8'>
        <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
          My account
        </p>

        <h1 className='mt-3 text-3xl font-semibold'>Edit profile</h1>

        <p className='mt-3 text-sm leading-6 text-neutral-600'>
          Update your profile photo, name, and phone number.
        </p>
      </div>

      <section className='mt-8 border border-neutral-200 p-5'>
        <h2 className='font-semibold'>Profile photo</h2>

        <p className='mt-2 text-sm leading-6 text-neutral-600'>
          Upload a JPEG, PNG, or WebP image up to 5 MB.
        </p>

        <div className='mt-5 flex flex-col gap-5 sm:flex-row sm:items-center'>
          {profilePhoto?.url ? (
            <img
              src={profilePhoto.url}
              alt={`${form.name || 'Customer'} profile`}
              className='h-24 w-24 rounded-full border border-neutral-200 object-cover'
            />
          ) : (
            <div
              aria-hidden='true'
              className='flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-3xl font-semibold text-neutral-500'>
              {form.name?.trim()?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}

          <div className='flex-1'>
            <label
              htmlFor='profile-photo'
              className='mb-2 block text-sm font-medium'>
              {profilePhoto?.url ? 'Choose replacement image' : 'Choose image'}
            </label>

            <input
              ref={fileInputRef}
              id='profile-photo'
              name='profilePhoto'
              type='file'
              accept='image/jpeg,image/png,image/webp'
              disabled={busy}
              onChange={handlePhotoChange}
              className='block w-full text-sm text-neutral-600 file:mr-4 file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50'
            />

            {selectedPhoto && (
              <p className='mt-2 text-xs text-neutral-600'>
                Selected: {selectedPhoto.name}
              </p>
            )}
          </div>
        </div>

        {photoError && (
          <div
            role='alert'
            className='mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {photoError.message}
          </div>
        )}

        {photoSuccessMessage && (
          <div
            role='status'
            className='mt-4 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
            {photoSuccessMessage}
          </div>
        )}

        <div className='mt-5 flex flex-col gap-3 sm:flex-row'>
          <button
            type='button'
            disabled={busy || !selectedPhoto}
            onClick={handlePhotoUpload}
            className='bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50'>
            {photoSaving && selectedPhoto
              ? 'Uploading...'
              : profilePhoto?.url
                ? 'Replace photo'
                : 'Upload photo'}
          </button>

          {profilePhoto?.url && (
            <button
              type='button'
              disabled={busy}
              onClick={handlePhotoRemove}
              className='border border-red-300 px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50'>
              {photoSaving && !selectedPhoto ? 'Removing...' : 'Remove photo'}
            </button>
          )}
        </div>
      </section>

      <form onSubmit={handleSubmit} className='mt-8 space-y-6'>
        <div>
          <label htmlFor='name' className='mb-2 block text-sm font-medium'>
            Name
          </label>

          <input
            id='name'
            name='name'
            type='text'
            autoComplete='name'
            required
            value={form.name}
            disabled={busy}
            onChange={handleChange}
            className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
          />

          {error?.fields?.name && (
            <p className='mt-2 text-sm text-red-600'>{error.fields.name}</p>
          )}
        </div>

        <div>
          <label htmlFor='phone' className='mb-2 block text-sm font-medium'>
            Phone number
          </label>

          <input
            id='phone'
            name='phone'
            type='tel'
            autoComplete='tel'
            placeholder='+91 98765 43210'
            value={form.phone}
            disabled={busy}
            onChange={handleChange}
            className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
          />

          <p className='mt-2 text-xs leading-5 text-neutral-500'>
            Phone number is optional. Clear the field and save to remove it.
          </p>

          {error?.fields?.phone && (
            <p className='mt-2 text-sm text-red-600'>{error.fields.phone}</p>
          )}
        </div>

        {error?.fields?.request && (
          <div
            role='alert'
            className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error.fields.request}
          </div>
        )}

        {error && Object.keys(error.fields || {}).length === 0 && (
          <div
            role='alert'
            className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error.message}
          </div>
        )}

        {successMessage && (
          <div
            role='status'
            className='border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
            {successMessage}
          </div>
        )}

        <div className='flex flex-col gap-3 sm:flex-row'>
          <button
            type='submit'
            disabled={busy}
            className='bg-black px-5 py-3 font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50'>
            {saving ? 'Saving changes...' : 'Save changes'}
          </button>

          <Link
            to='/account'
            className='border border-neutral-300 px-5 py-3 text-center font-medium transition hover:bg-neutral-50'>
            Cancel
          </Link>
        </div>
      </form>

      <section className='mt-10 border border-neutral-200 bg-neutral-50 p-5'>
        <h2 className='font-semibold'>Authentication email</h2>

        <p className='mt-2 text-sm leading-6 text-neutral-600'>
          Your sign-in email cannot be changed from this form.
        </p>

        <Link
          to='/account/security/email'
          className='mt-3 inline-block text-sm font-medium underline underline-offset-4'>
          Change authentication email
        </Link>
      </section>
    </main>
  );
}

export default EditProfilePage;
