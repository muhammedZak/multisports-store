import { useCallback, useEffect, useState } from 'react';

import { Link, useLocation, useNavigate, useParams } from 'react-router';

import {
  createMyAddress,
  fetchMyAddresses,
  updateMyAddress,
} from '../../api/userApi.js';

import { normalizeApiError } from '../../api/errors.js';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { Textarea } from '../../components/ui/Textarea.jsx';

import { AccountPageHeader } from '../../features/account/components/AccountPageHeader.jsx';

import { EMPTY_ADDRESS_FORM } from '../../features/account/account.constants.js';

import { validateAddressForm } from '../../features/account/account.utils.js';

function AddressFormPage() {
  const navigate = useNavigate();

  const location = useLocation();

  const { addressId } = useParams();

  const returnTo =
    location.state?.from === '/checkout' ? '/checkout' : '/account/addresses';

  const editMode = Boolean(addressId);

  const [form, setForm] = useState(EMPTY_ADDRESS_FORM);

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

    const { fields, normalized } = validateAddressForm(form);

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
      <div className='max-w-2xl'>
        <Skeleton className='h-8 w-44' />

        <Skeleton className='mt-8 h-96 w-full' />
      </div>
    );
  }

  if (editMode && error?.code === 'NOT_FOUND') {
    return (
      <div className='max-w-2xl'>
        <AccountPageHeader
          title='Address not found'
          backTo={returnTo}
          backLabel='Addresses'
        />

        <Alert variant='warning' className='mt-6'>
          This saved address does not exist in your account.
        </Alert>
      </div>
    );
  }

  return (
    <div className='max-w-2xl'>
      <AccountPageHeader
        title={editMode ? 'Edit address' : 'Add address'}
        description={
          editMode
            ? 'Update your saved shipping details.'
            : 'Save a shipping address for future Checkout use.'
        }
        backTo={returnTo}
        backLabel='Addresses'
      />

      <form onSubmit={handleSubmit} className='mt-8 space-y-5'>
        <Input
          id='fullName'
          name='fullName'
          label='Full name'
          type='text'
          autoComplete='name'
          maxLength={100}
          required
          disabled={saving}
          value={form.fullName}
          error={error?.fields?.fullName}
          onChange={handleChange}
        />

        <Input
          id='address-phone'
          name='phone'
          label='Phone'
          type='tel'
          autoComplete='tel'
          maxLength={25}
          required
          disabled={saving}
          placeholder='+91 98765 43210'
          value={form.phone}
          error={error?.fields?.phone}
          onChange={handleChange}
        />

        <Textarea
          id='address'
          name='address'
          label='Address'
          rows={4}
          maxLength={300}
          required
          disabled={saving}
          value={form.address}
          error={error?.fields?.address}
          onChange={handleChange}
        />

        <div className='grid gap-5 sm:grid-cols-2'>
          <Input
            id='city'
            name='city'
            label='City'
            type='text'
            maxLength={100}
            required
            disabled={saving}
            value={form.city}
            error={error?.fields?.city}
            onChange={handleChange}
          />

          <Input
            id='state'
            name='state'
            label='State'
            type='text'
            maxLength={100}
            required
            disabled={saving}
            value={form.state}
            error={error?.fields?.state}
            onChange={handleChange}
          />
        </div>

        <div className='grid gap-5 sm:grid-cols-2'>
          <Input
            id='postalCode'
            name='postalCode'
            label='Postal code'
            type='text'
            autoComplete='postal-code'
            maxLength={20}
            required
            disabled={saving}
            value={form.postalCode}
            error={error?.fields?.postalCode}
            onChange={handleChange}
          />

          <Input
            id='country'
            name='country'
            label='Country'
            type='text'
            autoComplete='country-name'
            maxLength={100}
            required
            disabled={saving}
            value={form.country}
            error={error?.fields?.country}
            onChange={handleChange}
          />
        </div>

        {!editMode ? (
          <label className='flex cursor-pointer items-start gap-3 border-y border-[var(--color-border)] py-4'>
            <input
              name='isDefault'
              type='checkbox'
              checked={form.isDefault}
              disabled={saving}
              onChange={handleChange}
              className='mt-1 size-4 accent-[var(--color-ink)]'
            />

            <span>
              <span className='block text-sm font-bold'>
                Set as default address
              </span>

              <span className='mt-1 block text-xs leading-5 text-[var(--color-muted)]'>
                This will replace any existing default address.
              </span>
            </span>
          </label>
        ) : null}

        {error?.fields?.request ? (
          <Alert variant='danger'>{error.fields.request}</Alert>
        ) : null}

        {error &&
        Object.keys(error.fields || {}).length === 0 &&
        error.code !== 'NOT_FOUND' ? (
          <Alert variant='danger'>{error.message}</Alert>
        ) : null}

        <div className='flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-5'>
          <Button type='submit' disabled={saving}>
            {saving ? 'Saving...' : editMode ? 'Save changes' : 'Save address'}
          </Button>

          <Link
            to='/account/addresses'
            className='inline-flex min-h-10 items-center border border-[var(--color-border-strong)] px-4 text-sm font-semibold hover:border-[var(--color-ink)]'>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default AddressFormPage;
