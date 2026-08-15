import { useCallback, useEffect, useState } from 'react';

import { Link } from 'react-router';

import {
  deleteMyAddress,
  fetchMyAddresses,
  setMyDefaultAddress,
} from '../../api/userApi.js';

import { normalizeApiError } from '../../api/errors.js';

function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  const [action, setAction] = useState({
    type: null,
    addressId: null,
  });

  const actionLoading = Boolean(action.type);

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const items = await fetchMyAddresses();

      setAddresses(items);
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          'Unable to load your saved addresses. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  async function handleSetDefault(addressId) {
    setError(null);
    setMessage('');

    setAction({
      type: 'default',
      addressId,
    });

    try {
      const updatedItems = await setMyDefaultAddress(addressId);

      setAddresses(updatedItems);
      setMessage('Default address updated.');
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          'Unable to update your default address.',
        ),
      );
    } finally {
      setAction({
        type: null,
        addressId: null,
      });
    }
  }

  async function handleDelete(address) {
    const confirmed = window.confirm(
      `Remove the saved address for ${address.fullName}?`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage('');

    setAction({
      type: 'delete',
      addressId: address.id,
    });

    try {
      await deleteMyAddress(address.id);

      setAddresses((current) =>
        current.filter((item) => item.id !== address.id),
      );

      setMessage('Address removed.');
    } catch (requestError) {
      setError(
        normalizeApiError(requestError, 'Unable to remove this address.'),
      );
    } finally {
      setAction({
        type: null,
        addressId: null,
      });
    }
  }

  return (
    <main className='mx-auto max-w-4xl p-6'>
      <Link
        to='/account'
        className='text-sm font-medium underline underline-offset-4'>
        Back to profile
      </Link>

      <div className='mt-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
            My account
          </p>

          <h1 className='mt-3 text-3xl font-semibold'>Saved addresses</h1>

          <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>
            Save shipping addresses so they can be reused during checkout later.
          </p>
        </div>

        <Link
          to='/account/addresses/new'
          className='inline-flex justify-center bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800'>
          Add address
        </Link>
      </div>

      {message && (
        <div
          role='status'
          className='mt-6 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
          {message}
        </div>
      )}

      {error && (
        <div
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error.message}
        </div>
      )}

      {loading && (
        <section className='mt-8 border border-neutral-200 p-6'>
          <p className='text-sm text-neutral-600'>Loading addresses...</p>
        </section>
      )}

      {!loading && error && addresses.length === 0 && (
        <button
          type='button'
          onClick={loadAddresses}
          className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
          Try again
        </button>
      )}

      {!loading && !error && addresses.length === 0 && (
        <section className='mt-8 border border-neutral-200 p-8 text-center'>
          <h2 className='text-lg font-semibold'>No saved addresses</h2>

          <p className='mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-600'>
            Add your first shipping address so it is ready when checkout is
            implemented.
          </p>

          <Link
            to='/account/addresses/new'
            className='mt-5 inline-flex bg-black px-5 py-3 text-sm font-medium text-white'>
            Add your first address
          </Link>
        </section>
      )}

      {!loading && addresses.length > 0 && (
        <section className='mt-8 grid gap-4 md:grid-cols-2'>
          {addresses.map((address) => {
            const settingDefault =
              action.type === 'default' && action.addressId === address.id;

            const deleting =
              action.type === 'delete' && action.addressId === address.id;

            return (
              <article
                key={address.id}
                className='border border-neutral-200 p-5'>
                <div className='flex items-start justify-between gap-4'>
                  <div>
                    <p className='font-semibold'>{address.fullName}</p>

                    {address.isDefault && (
                      <span className='mt-2 inline-block bg-green-50 px-2 py-1 text-xs font-medium text-green-700'>
                        Default
                      </span>
                    )}
                  </div>
                </div>

                <div className='mt-4 space-y-1 text-sm leading-6 text-neutral-700'>
                  <p>{address.address}</p>

                  <p>
                    {address.city}, {address.state} {address.postalCode}
                  </p>

                  <p>{address.country}</p>

                  <p className='pt-2'>{address.phone}</p>
                </div>

                <div className='mt-5 flex flex-wrap gap-3 border-t border-neutral-200 pt-4'>
                  <Link
                    to={`/account/addresses/${address.id}/edit`}
                    className='text-sm font-medium underline underline-offset-4'>
                    Edit
                  </Link>

                  {!address.isDefault && (
                    <button
                      type='button'
                      disabled={actionLoading}
                      onClick={() => handleSetDefault(address.id)}
                      className='text-sm font-medium underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50'>
                      {settingDefault ? 'Setting default...' : 'Set default'}
                    </button>
                  )}

                  <button
                    type='button'
                    disabled={actionLoading}
                    onClick={() => handleDelete(address)}
                    className='text-sm font-medium text-red-700 underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50'>
                    {deleting ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

export default AddressesPage;
