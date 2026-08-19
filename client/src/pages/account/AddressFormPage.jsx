import { useCallback, useEffect, useState } from 'react';

import { Link, useLocation, useNavigate, useParams } from 'react-router';

import {
  createMyAddress,
  fetchMyAddresses,
  updateMyAddress,
} from '../../api/userApi.js';

import { normalizeApiError } from '../../api/errors.js';

const PHONE_ALLOWED_REGEX = /^\+?[0-9\s()-]+$/;

const EMPTY_FORM = {
  fullName: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  isDefault: false,
};

function isValidPhone(phone) {
  const digitCount = phone.replace(/\D/g, '').length;

  return (
    phone.length <= 25 &&
    PHONE_ALLOWED_REGEX.test(phone) &&
    digitCount >= 7 &&
    digitCount <= 15
  );
}

function validateForm(form) {
  const fields = {};

  const normalized = {
    fullName: form.fullName.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    postalCode: form.postalCode.trim(),
    country: form.country.trim(),
  };

  if (!normalized.fullName) {
    fields.fullName = 'Full name is required.';
  } else if (normalized.fullName.length > 100) {
    fields.fullName = 'Full name is too long.';
  }

  if (!normalized.phone || !isValidPhone(normalized.phone)) {
    fields.phone = 'Enter a valid phone number.';
  }

  if (!normalized.address) {
    fields.address = 'Address is required.';
  } else if (normalized.address.length > 300) {
    fields.address = 'Address is too long.';
  }

  if (!normalized.city) {
    fields.city = 'City is required.';
  } else if (normalized.city.length > 100) {
    fields.city = 'City is too long.';
  }

  if (!normalized.state) {
    fields.state = 'State is required.';
  } else if (normalized.state.length > 100) {
    fields.state = 'State is too long.';
  }

  if (!normalized.postalCode) {
    fields.postalCode = 'Postal code is required.';
  } else if (normalized.postalCode.length > 20) {
    fields.postalCode = 'Postal code is too long.';
  }

  if (!normalized.country) {
    fields.country = 'Country is required.';
  } else if (normalized.country.length > 100) {
    fields.country = 'Country is too long.';
  }

  return {
    fields,
    normalized,
  };
}

function AddressFormPage() {
  const navigate = useNavigate();

  const location = useLocation();

  const returnTo =
    location.state?.from === '/checkout' ? '/checkout' : '/account/addresses';

  const { addressId } = useParams();

  const editMode = Boolean(addressId);

  const [form, setForm] = useState(EMPTY_FORM);

  const [pageLoading, setPageLoading] = useState(editMode);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState(null);

  const loadAddress = useCallback(async () => {
    if (!editMode) {
      return;
    }

    setPageLoading(true);
    setError(null);

    try {
      const items = await fetchMyAddresses();

      const address = items.find((item) => item.id === addressId);

      if (!address) {
        setError({
          code: 'NOT_FOUND',
          message: 'Address not found.',
          fields: {},
        });

        return;
      }

      setForm({
        fullName: address.fullName,
        phone: address.phone,
        address: address.address,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        isDefault: address.isDefault,
      });
    } catch (requestError) {
      setError(normalizeApiError(requestError, 'Unable to load this address.'));
    } finally {
      setPageLoading(false);
    }
  }, [addressId, editMode]);

  useEffect(() => {
    loadAddress();
  }, [loadAddress]);

  function handleChange(event) {
    const { name, value, checked, type } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));

    setError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError(null);

    const { fields, normalized } = validateForm(form);

    if (Object.keys(fields).length > 0) {
      setError({
        code: 'VALIDATION_ERROR',
        message: 'Please correct the invalid fields.',
        fields,
      });

      return;
    }

    setSaving(true);

    try {
      if (editMode) {
        await updateMyAddress(addressId, normalized);
      } else {
        await createMyAddress({
          ...normalized,
          isDefault: form.isDefault,
        });
      }

     navigate(returnTo, {
       replace: true,
     });
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          editMode
            ? 'Unable to update this address.'
            : 'Unable to save this address.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  if (pageLoading) {
    return (
      <main className='mx-auto max-w-2xl p-6'>
        <p className='text-sm text-neutral-600'>Loading address...</p>
      </main>
    );
  }

  if (editMode && error?.code === 'NOT_FOUND') {
    return (
      <main className='mx-auto max-w-2xl p-6'>
        <Link
          to={returnTo}
          className='text-sm font-medium underline underline-offset-4'>
          Back to addresses
        </Link>

        <section className='mt-8 border border-neutral-200 p-6'>
          <h1 className='text-xl font-semibold'>Address not found</h1>

          <p className='mt-2 text-sm leading-6 text-neutral-600'>
            This saved address does not exist in your account.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className='mx-auto max-w-2xl p-6'>
      <Link
        to={returnTo}
        className='text-sm font-medium underline underline-offset-4'>
        Back to addresses
      </Link>

      <div className='mt-8'>
        <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
          My account
        </p>

        <h1 className='mt-3 text-3xl font-semibold'>
          {editMode ? 'Edit address' : 'Add address'}
        </h1>

        <p className='mt-3 text-sm leading-6 text-neutral-600'>
          {editMode
            ? 'Update your saved shipping details.'
            : 'Save a shipping address for future checkout use.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className='mt-8 space-y-6'>
        <div>
          <label htmlFor='fullName' className='mb-2 block text-sm font-medium'>
            Full name
          </label>

          <input
            id='fullName'
            name='fullName'
            type='text'
            autoComplete='name'
            maxLength={100}
            required
            disabled={saving}
            value={form.fullName}
            onChange={handleChange}
            className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
          />

          {error?.fields?.fullName && (
            <p className='mt-2 text-sm text-red-600'>{error.fields.fullName}</p>
          )}
        </div>

        <div>
          <label htmlFor='phone' className='mb-2 block text-sm font-medium'>
            Phone
          </label>

          <input
            id='phone'
            name='phone'
            type='tel'
            autoComplete='tel'
            maxLength={25}
            required
            disabled={saving}
            placeholder='+91 98765 43210'
            value={form.phone}
            onChange={handleChange}
            className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
          />

          {error?.fields?.phone && (
            <p className='mt-2 text-sm text-red-600'>{error.fields.phone}</p>
          )}
        </div>

        <div>
          <label htmlFor='address' className='mb-2 block text-sm font-medium'>
            Address
          </label>

          <textarea
            id='address'
            name='address'
            rows={4}
            maxLength={300}
            required
            disabled={saving}
            value={form.address}
            onChange={handleChange}
            className='w-full resize-y border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
          />

          {error?.fields?.address && (
            <p className='mt-2 text-sm text-red-600'>{error.fields.address}</p>
          )}
        </div>

        <div className='grid gap-6 sm:grid-cols-2'>
          <div>
            <label htmlFor='city' className='mb-2 block text-sm font-medium'>
              City
            </label>

            <input
              id='city'
              name='city'
              type='text'
              maxLength={100}
              required
              disabled={saving}
              value={form.city}
              onChange={handleChange}
              className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
            />

            {error?.fields?.city && (
              <p className='mt-2 text-sm text-red-600'>{error.fields.city}</p>
            )}
          </div>

          <div>
            <label htmlFor='state' className='mb-2 block text-sm font-medium'>
              State
            </label>

            <input
              id='state'
              name='state'
              type='text'
              maxLength={100}
              required
              disabled={saving}
              value={form.state}
              onChange={handleChange}
              className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
            />

            {error?.fields?.state && (
              <p className='mt-2 text-sm text-red-600'>{error.fields.state}</p>
            )}
          </div>
        </div>

        <div className='grid gap-6 sm:grid-cols-2'>
          <div>
            <label
              htmlFor='postalCode'
              className='mb-2 block text-sm font-medium'>
              Postal code
            </label>

            <input
              id='postalCode'
              name='postalCode'
              type='text'
              autoComplete='postal-code'
              maxLength={20}
              required
              disabled={saving}
              value={form.postalCode}
              onChange={handleChange}
              className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
            />

            {error?.fields?.postalCode && (
              <p className='mt-2 text-sm text-red-600'>
                {error.fields.postalCode}
              </p>
            )}
          </div>

          <div>
            <label htmlFor='country' className='mb-2 block text-sm font-medium'>
              Country
            </label>

            <input
              id='country'
              name='country'
              type='text'
              autoComplete='country-name'
              maxLength={100}
              required
              disabled={saving}
              value={form.country}
              onChange={handleChange}
              className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
            />

            {error?.fields?.country && (
              <p className='mt-2 text-sm text-red-600'>
                {error.fields.country}
              </p>
            )}
          </div>
        </div>

        {!editMode && (
          <label className='flex items-start gap-3 border border-neutral-200 p-4'>
            <input
              name='isDefault'
              type='checkbox'
              checked={form.isDefault}
              disabled={saving}
              onChange={handleChange}
              className='mt-1 h-4 w-4'
            />

            <span>
              <span className='block text-sm font-medium'>
                Set as default address
              </span>

              <span className='mt-1 block text-xs leading-5 text-neutral-500'>
                This will replace any existing default address.
              </span>
            </span>
          </label>
        )}

        {error?.fields?.request && (
          <div
            role='alert'
            className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error.fields.request}
          </div>
        )}

        {error &&
          Object.keys(error.fields || {}).length === 0 &&
          error.code !== 'NOT_FOUND' && (
            <div
              role='alert'
              className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
              {error.message}
            </div>
          )}

        <div className='flex flex-col gap-3 sm:flex-row'>
          <button
            type='submit'
            disabled={saving}
            className='bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50'>
            {saving ? 'Saving...' : editMode ? 'Save changes' : 'Save address'}
          </button>

          <Link
            to='/account/addresses'
            className='border border-neutral-300 px-5 py-3 text-center text-sm font-medium transition hover:bg-neutral-50'>
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}

export default AddressFormPage;
