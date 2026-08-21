import { useEffect, useMemo, useRef, useState } from 'react';

import { fetchPublicProduct } from '../../../api/productApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import { resolveGuestCartItem } from '../cart.utils.js';

export function useGuestCartResolution({
  authInitialized,
  isGuest,
  guestItems,
}) {
  const [guestProducts, setGuestProducts] = useState({});

  const [guestErrors, setGuestErrors] = useState({});

  const [guestLoadStatus, setGuestLoadStatus] = useState('idle');

  const [guestReloadKey, setGuestReloadKey] = useState(0);

  const [guestPriceChanges, setGuestPriceChanges] = useState([]);

  const guestProductsRef = useRef({});

  const guestHasResolvedOnceRef = useRef(false);

  const guestProductIdsKey = useMemo(
    () =>
      [...new Set(guestItems.map((item) => item.productId))].sort().join('|'),
    [guestItems],
  );

  useEffect(() => {
    if (!authInitialized || !isGuest) {
      return undefined;
    }

    if (!guestProductIdsKey) {
      setGuestProducts({});

      guestProductsRef.current = {};

      setGuestErrors({});

      setGuestPriceChanges([]);

      setGuestLoadStatus('succeeded');

      guestHasResolvedOnceRef.current = false;

      return undefined;
    }

    let cancelled = false;

    const isRefresh = guestHasResolvedOnceRef.current;

    async function loadGuestProducts() {
      setGuestLoadStatus(isRefresh ? 'refreshing' : 'loading');

      const previousProducts = guestProductsRef.current;

      const results = await Promise.all(
        guestProductIdsKey.split('|').map(async (productId) => {
          try {
            return {
              productId,

              product: await fetchPublicProduct(productId),

              error: null,

              retainPrevious: false,
            };
          } catch (requestError) {
            const normalizedError = normalizeApiError(
              requestError,
              'Unable to load current information for this cart item.',
            );

            const status = requestError.response?.status;

            /*
             * Keep previous display data only
             * for a temporary/recoverable
             * request failure.
             *
             * Authoritative 4xx responses must
             * replace stale catalog data.
             */
            const retainPrevious =
              Boolean(previousProducts[productId]) &&
              (status == null || status >= 500 || status === 429);

            return {
              productId,

              product: null,

              error: normalizedError,

              retainPrevious,
            };
          }
        }),
      );

      if (cancelled) {
        return;
      }

      const nextProducts = {};

      const nextErrors = {};

      const nextPriceChanges = [];

      for (const result of results) {
        const previousProduct = previousProducts[result.productId];

        if (result.product) {
          nextProducts[result.productId] = result.product;

          if (
            isRefresh &&
            previousProduct &&
            Number.isSafeInteger(previousProduct.currentPrice) &&
            Number.isSafeInteger(result.product.currentPrice) &&
            previousProduct.currentPrice !== result.product.currentPrice
          ) {
            nextPriceChanges.push({
              productId: result.productId,

              productName:
                result.product.name ?? previousProduct.name ?? 'Cart item',

              previousPrice: previousProduct.currentPrice,

              currentPrice: result.product.currentPrice,
            });
          }
        } else if (result.retainPrevious && previousProduct) {
          /*
           * Temporary failure:
           *
           * preserve the last successful
           * display snapshot.
           *
           * The associated Guest error still
           * marks the row as unconfirmed.
           */
          nextProducts[result.productId] = previousProduct;
        }

        if (result.error) {
          nextErrors[result.productId] = result.error;
        }
      }

      setGuestProducts(nextProducts);

      guestProductsRef.current = nextProducts;

      setGuestErrors(nextErrors);

      setGuestPriceChanges(isRefresh ? nextPriceChanges : []);

      setGuestLoadStatus(
        Object.keys(nextErrors).length > 0 ? 'partial' : 'succeeded',
      );

      guestHasResolvedOnceRef.current = true;
    }

    loadGuestProducts();

    return () => {
      cancelled = true;
    };
  }, [authInitialized, guestProductIdsKey, guestReloadKey, isGuest]);

  const resolvedItems = useMemo(
    () =>
      guestItems.map((item) =>
        resolveGuestCartItem(
          item,

          guestProducts[item.productId],

          guestErrors[item.productId],
        ),
      ),
    [guestErrors, guestItems, guestProducts],
  );

  const subtotal = useMemo(
    () =>
      resolvedItems.reduce((total, item) => total + (item.lineTotal ?? 0), 0),
    [resolvedItems],
  );

  function refresh() {
    if (
      !isGuest ||
      guestItems.length === 0 ||
      guestLoadStatus === 'refreshing'
    ) {
      return;
    }

    setGuestPriceChanges([]);

    setGuestLoadStatus('refreshing');

    setGuestReloadKey((current) => current + 1);
  }

  return {
    resolvedItems,
    subtotal,

    guestLoadStatus,
    guestReloadKey,

    guestPriceChanges,

    refresh,
  };
}
