import { useCallback, useEffect, useRef, useState } from 'react';

import { previewCheckout } from '../../../api/checkoutApi.js';

import { normalizeApiError } from '../../../api/errors.js';

export function useCheckoutPreview(selectedAddressId) {
  const [preview, setPreview] = useState(null);

  const [status, setStatus] = useState('idle');

  const [error, setError] = useState(null);

  const requestRef = useRef(0);

  const loadPreview = useCallback(async () => {
    if (!selectedAddressId) {
      requestRef.current += 1;

      setPreview(null);

      setStatus('idle');

      setError(null);

      return;
    }

    const requestId = requestRef.current + 1;

    requestRef.current = requestId;

    setStatus('loading');

    setError(null);

    try {
      const checkout = await previewCheckout({
        shippingAddressId: selectedAddressId,
      });

      /*
       * Address may have changed
       * while this request was
       * still running.
       */
      if (requestRef.current !== requestId) {
        return;
      }

      setPreview(checkout);

      setStatus('succeeded');
    } catch (requestError) {
      if (requestRef.current !== requestId) {
        return;
      }

      setPreview(null);

      setError(normalizeApiError(requestError, 'Unable to prepare checkout.'));

      setStatus('failed');
    }
  }, [selectedAddressId]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  return {
    preview,
    status,
    error,

    loadPreview,
  };
}
