import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchMyAddresses } from '../../../api/userApi.js';

import { normalizeApiError } from '../../../api/errors.js';

export function useCheckoutAddresses() {
  const [addresses, setAddresses] = useState([]);

  const [status, setStatus] = useState('loading');

  const [error, setError] = useState(null);

  const [selectedAddressId, setSelectedAddressId] = useState('');

  const loadAddresses = useCallback(async () => {
    setStatus('loading');

    setError(null);

    try {
      const items = await fetchMyAddresses();

      setAddresses(items);

      setSelectedAddressId((current) => {
        if (current && items.some((item) => item.id === current)) {
          return current;
        }

        return items.find((item) => item.isDefault)?.id ?? items[0]?.id ?? '';
      });

      setStatus('succeeded');
    } catch (requestError) {
      setError(
        normalizeApiError(requestError, 'Unable to load your saved addresses.'),
      );

      setStatus('failed');
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );

  return {
    addresses,

    status,
    error,

    selectedAddressId,
    selectedAddress,

    setSelectedAddressId,

    loadAddresses,
  };
}
