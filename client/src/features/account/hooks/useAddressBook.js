import { useCallback, useEffect, useState } from 'react';

import {
  deleteMyAddress,
  fetchMyAddresses,
  setMyDefaultAddress,
} from '../../../api/userApi.js';

import { normalizeApiError } from '../../../api/errors.js';

export function useAddressBook() {
  const [addresses, setAddresses] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [message, setMessage] = useState('');

  const [action, setAction] = useState({
    type: null,
    addressId: null,
  });

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

  async function setDefault(addressId) {
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

  async function removeAddress(addressId) {
    setError(null);

    setMessage('');

    setAction({
      type: 'delete',
      addressId,
    });

    try {
      await deleteMyAddress(addressId);

      setAddresses((current) =>
        current.filter((item) => item.id !== addressId),
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

  return {
    addresses,

    loading,

    error,

    message,

    action,

    actionLoading: Boolean(action.type),

    loadAddresses,

    setDefault,

    removeAddress,
  };
}
