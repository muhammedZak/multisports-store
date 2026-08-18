import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';

import { normalizeApiError } from '../../api/errors.js';
import { fetchPublicProduct } from '../../api/productApi.js';
import {
  clearCart,
  clearGuestCart,
  loadCustomerCart,
  revalidateCustomerCart,
  removeCartItem,
  removeGuestCartItem,
  updateCartItemQuantity,
  updateGuestCartItemQuantity,
} from '../../features/cart/cartSlice.js';
import { formatInrFromPaise } from '../../utils/money.js';

const STOCK_LABELS = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
};

function formatOptionName(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getPrimaryImage(images = []) {
  return images.find((image) => image.isPrimary) ?? images[0] ?? null;
}

function getGuestItemKey(item) {
  return `${item.productId}:${item.variantId ?? 'simple'}`;
}

function resolveGuestItem(item, product, requestError) {
  if (!product) {
    return {
      id: getGuestItemKey(item),
      product: {
        id: item.productId,
        name: null,
        brand: null,
        primaryImage: null,
      },
      variant: item.variantId ? { id: item.variantId, options: {} } : null,
      quantity: item.quantity,
      unitPrice: null,
      lineTotal: null,
      availability: {
        stockState: null,
        isAvailable: false,
      },
      issues: [
        {
          message:
            requestError?.message ??
            'Unable to load current information for this item.',
        },
      ],
    };
  }

  const variants = product.variants ?? [];
  const issues = [];
  let variant = null;

  if (requestError) {
    issues.push({
      message:
        requestError.message ??
        'Unable to confirm current information for this item.',
    });
  }

  if (variants.length > 0) {
    if (!item.variantId) {
      issues.push({ message: 'This cart item no longer has a valid option.' });
    } else {
      variant = variants.find((entry) => entry.id === item.variantId) ?? null;

      if (!variant) {
        issues.push({
          message: 'The selected product option is no longer available.',
        });
      }
    }
  } else if (item.variantId) {
    issues.push({
      message: 'This cart item no longer matches the product configuration.',
    });
  }

  const stockState = variant?.stockState ?? product.stockState ?? null;

  if (stockState === 'out_of_stock') {
    issues.push({ message: 'This cart item is currently out of stock.' });
  }

  const unitPrice = Number.isSafeInteger(product.currentPrice)
    ? product.currentPrice
    : null;
  const lineTotal =
    unitPrice !== null && Number.isSafeInteger(unitPrice * item.quantity)
      ? unitPrice * item.quantity
      : null;

  if (unitPrice === null || lineTotal === null) {
    issues.push({ message: 'Current pricing for this item is unavailable.' });
  }

  return {
    id: getGuestItemKey(item),
    product: {
      id: product.id,
      name: product.name,
      brand: product.brand,
      primaryImage: getPrimaryImage(product.images),
    },
    variant: variant
      ? { id: variant.id, options: variant.options ?? {} }
      : item.variantId
        ? { id: item.variantId, options: {} }
        : null,
    quantity: item.quantity,
    unitPrice,
    lineTotal,
    availability: {
      stockState,
      isAvailable: issues.length === 0,
    },
    issues,
  };
}

function CartItemRow({
  item,
  canEditQuantity,
  quantityBlocked,
  canRemove,
  isUpdatingQuantity,
  isRemoving,
  itemActionError,
  onQuantityChange,
  onRemove,
}) {
  const productName = item.product?.name ?? 'Unavailable product';
  const image = item.product?.primaryImage ?? null;
  const options = Object.entries(item.variant?.options ?? {});
  const stockLabel = STOCK_LABELS[item.availability?.stockState];

  const canDecrease =
    canEditQuantity &&
    !quantityBlocked &&
    !isUpdatingQuantity &&
    item.quantity > 1;

  const canIncrease =
    canEditQuantity &&
    !quantityBlocked &&
    !isUpdatingQuantity &&
    item.product?.name &&
    item.unitPrice !== null &&
    item.availability?.stockState !== 'out_of_stock';

  return (
    <article className='border-b border-neutral-200 py-6 first:pt-0 last:border-0 last:pb-0'>
      <div className='grid gap-5 sm:grid-cols-[130px_1fr]'>
        <div className='aspect-square overflow-hidden bg-neutral-100'>
          {image?.url ? (
            <img
              src={image.url}
              alt={image.altText || productName}
              className='h-full w-full object-cover'
            />
          ) : (
            <div className='flex h-full items-center justify-center px-3 text-center text-xs text-neutral-500'>
              No image available
            </div>
          )}
        </div>

        <div>
          {item.product?.name ? (
            <Link
              to={`/products/${item.product.id}`}
              className='text-lg font-semibold hover:underline'>
              {productName}
            </Link>
          ) : (
            <h2 className='text-lg font-semibold'>{productName}</h2>
          )}

          {item.product?.brand && (
            <p className='mt-1 text-sm text-neutral-500'>
              {item.product.brand}
            </p>
          )}

          {options.length > 0 && (
            <div className='mt-3 flex flex-wrap gap-4 text-sm'>
              {options.map(([name, value]) => (
                <p key={name}>
                  <span className='text-neutral-500'>
                    {formatOptionName(name)}:{' '}
                  </span>
                  <span className='font-medium'>{String(value)}</span>
                </p>
              ))}
            </div>
          )}

          {item.variant && options.length === 0 && (
            <p className='mt-3 text-sm text-neutral-500'>
              Selected option unavailable
            </p>
          )}

          {stockLabel && (
            <p className='mt-3 text-sm font-medium'>{stockLabel}</p>
          )}

          <div className='mt-5 grid gap-3 text-sm sm:grid-cols-3'>
            <div>
              <p className='text-neutral-500'>Quantity</p>

              <div className='mt-1 inline-flex items-center border border-neutral-300'>
                <button
                  type='button'
                  aria-label={`Decrease quantity for ${productName}`}
                  disabled={!canDecrease}
                  onClick={() => onQuantityChange(item, item.quantity - 1)}
                  className='h-9 w-9 text-lg disabled:cursor-not-allowed disabled:text-neutral-300'>
                  −
                </button>

                <span
                  aria-live='polite'
                  className='min-w-10 border-x border-neutral-300 px-2 text-center font-medium'>
                  {item.quantity}
                </span>

                <button
                  type='button'
                  aria-label={`Increase quantity for ${productName}`}
                  disabled={!canIncrease}
                  onClick={() => onQuantityChange(item, item.quantity + 1)}
                  className='h-9 w-9 text-lg disabled:cursor-not-allowed disabled:text-neutral-300'>
                  +
                </button>
              </div>

              {isUpdatingQuantity && (
                <p className='mt-2 text-xs text-neutral-500'>Updating...</p>
              )}

              {quantityBlocked && (
                <p className='mt-2 text-xs text-neutral-500'>
                  Refresh or remove this item before changing its quantity.
                </p>
              )}
            </div>
            <div>
              <p className='text-neutral-500'>Unit price</p>
              <p className='mt-1 font-medium'>
                {formatInrFromPaise(item.unitPrice)}
              </p>
            </div>
            <div>
              <p className='text-neutral-500'>Item subtotal</p>
              <p className='mt-1 font-semibold'>
                {formatInrFromPaise(item.lineTotal)}
              </p>
            </div>
          </div>
          <div className='mt-4'>
            <button
              type='button'
              disabled={!canRemove || isRemoving}
              onClick={() => onRemove(item)}
              className='text-sm font-medium text-red-700 underline underline-offset-4 disabled:cursor-not-allowed disabled:text-neutral-400'>
              {isRemoving ? 'Removing...' : 'Remove'}
            </button>
          </div>
          {itemActionError && (
            <p
              role='alert'
              className='mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
              {itemActionError.message ?? 'Unable to update this cart item.'}
            </p>
          )}

          {item.issues?.map((issue, index) => (
            <p
              key={`${item.id}-issue-${index}`}
              className='mt-3 border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800'>
              {issue.message}
            </p>
          ))}
        </div>
      </div>
    </article>
  );
}

function CartPage() {
  const dispatch = useDispatch();
  const { initialized: authInitialized, user } = useSelector(
    (state) => state.auth,
  );
  const {
    cart: customerCart,
    guestItems,
    initialized: customerCartInitialized,
    loadStatus,
    loadError,
    actionStatus,
    actionError,
    actionItemId,
    actionOperation,
    mergeStatus,
    mergeError,
    revalidationStatus,
    revalidationError,
  } = useSelector((state) => state.cart);

  const [guestProducts, setGuestProducts] = useState({});
  const [guestErrors, setGuestErrors] = useState({});
  const [guestLoadStatus, setGuestLoadStatus] = useState('idle');
  const [guestReloadKey, setGuestReloadKey] = useState(0);

  const [guestPriceChanges, setGuestPriceChanges] = useState([]);

  const guestProductsRef = useRef({});
  const guestHasResolvedOnceRef = useRef(false);

  const isCustomer = user?.role === 'customer';
  const isGuest = !user;
  const hasAuthenticatedUser = Boolean(user);

  const isCustomerCartRevalidating =
    isCustomer && revalidationStatus === 'loading';

  const customerCartHasIssues =
    isCustomer && (customerCart.issues?.length ?? 0) > 0;

  const guestProductIdsKey = useMemo(
    () =>
      [...new Set(guestItems.map((item) => item.productId))].sort().join('|'),
    [guestItems],
  );

  useEffect(() => {
    if (!authInitialized || hasAuthenticatedUser) {
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
          } catch (error) {
            const normalizedError = normalizeApiError(
              error,
              'Unable to load current information for this cart item.',
            );

            const status = error.response?.status;

            /*
             * Keep the last successfully resolved Product only when the new
             * request failed for a temporary/recoverable reason.
             *
             * An authoritative 4xx such as Product-not-found must replace the
             * old Product with an unavailable line instead of pretending the
             * old catalog data still exists.
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
           * Temporary refresh failure:
           * preserve the last display snapshot, but guestErrors below ensures
           * the line is marked as not currently confirmed.
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
  }, [
    authInitialized,
    guestProductIdsKey,
    guestReloadKey,
    hasAuthenticatedUser,
  ]);

  function handleCustomerCartRefresh() {
    if (!isCustomer || !user?.id) {
      return;
    }

    dispatch(revalidateCustomerCart(user.id));
  }

  function handleGuestCartRefresh() {
    if (
      !isGuest ||
      guestItems.length === 0 ||
      guestLoadStatus === 'refreshing'
    ) {
      return;
    }

    setGuestPriceChanges([]);
    setGuestLoadStatus('refreshing');

    setGuestReloadKey((value) => value + 1);
  }

  const guestResolvedItems = useMemo(
    () =>
      guestItems.map((item) =>
        resolveGuestItem(
          item,
          guestProducts[item.productId],
          guestErrors[item.productId],
        ),
      ),
    [guestErrors, guestItems, guestProducts],
  );

  const guestSubtotal = useMemo(
    () =>
      guestResolvedItems.reduce(
        (total, item) => total + (item.lineTotal ?? 0),
        0,
      ),
    [guestResolvedItems],
  );

  function handleQuantityChange(item, nextQuantity) {
    if (!Number.isSafeInteger(nextQuantity) || nextQuantity < 1) {
      return;
    }

    if (isCustomer) {
      dispatch(
        updateCartItemQuantity({
          customerId: user.id,
          cartItemId: item.id,
          quantity: nextQuantity,
        }),
      );

      return;
    }

    if (isGuest) {
      dispatch(
        updateGuestCartItemQuantity({
          productId: item.product.id,
          ...(item.variant?.id
            ? {
                variantId: item.variant.id,
              }
            : {}),
          quantity: nextQuantity,
        }),
      );
    }
  }

  function handleRemoveItem(item) {
    if (isCustomer) {
      dispatch(
        removeCartItem({
          customerId: user.id,
          cartItemId: item.id,
        }),
      );

      return;
    }

    if (isGuest) {
      dispatch(
        removeGuestCartItem({
          productId: item.product.id,
          ...(item.variant?.id
            ? {
                variantId: item.variant.id,
              }
            : {}),
        }),
      );
    }
  }

  function handleClearCart() {
    if (isCustomer) {
      dispatch(clearCart(user.id));
      return;
    }

    if (isGuest) {
      dispatch(clearGuestCart());
    }
  }

  if (!authInitialized) {
    return (
      <main className='mx-auto max-w-7xl px-5 py-10 lg:px-8'>
        <p className='text-sm text-neutral-600'>Checking your cart...</p>
      </main>
    );
  }

  if (user && !isCustomer) {
    return (
      <main className='mx-auto max-w-7xl px-5 py-16 lg:px-8'>
        <h1 className='text-3xl font-semibold'>Shopping Cart</h1>
        <p className='mt-3 text-sm text-neutral-600'>
          Cart shopping is available to Guests and Customer accounts.
        </p>
        <Link
          to='/shop'
          className='mt-6 inline-flex bg-black px-5 py-2.5 text-sm font-medium text-white'>
          Back to shop
        </Link>
      </main>
    );
  }

  if (isCustomer && mergeStatus === 'loading') {
    return (
      <main className='mx-auto max-w-7xl px-5 py-10 lg:px-8'>
        <p className='text-sm text-neutral-600'>Merging your Guest Cart...</p>
      </main>
    );
  }

  if (isCustomer && (!customerCartInitialized || loadStatus === 'loading')) {
    return (
      <main className='mx-auto max-w-7xl px-5 py-10 lg:px-8'>
        <p className='text-sm text-neutral-600'>Loading your cart...</p>
      </main>
    );
  }

  if (isCustomer && loadStatus === 'failed') {
    return (
      <main className='mx-auto max-w-7xl px-5 py-16 lg:px-8'>
        {mergeStatus === 'failed' && (
          <div
            role='alert'
            className='mb-4 max-w-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
            <p className='font-medium'>Your Guest Cart could not be merged.</p>

            <p className='mt-1'>
              {mergeError?.message ?? 'Unable to merge your Guest Cart.'}
            </p>

            <p className='mt-1'>
              Your Guest Cart has been kept and was not discarded.
            </p>
          </div>
        )}

        <div
          role='alert'
          className='max-w-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {loadError?.message ?? 'Unable to load your cart.'}
        </div>
        <button
          type='button'
          onClick={() => dispatch(loadCustomerCart(user.id))}
          className='mt-5 bg-black px-5 py-2.5 text-sm font-medium text-white'>
          Try again
        </button>
      </main>
    );
  }

  const guestIsLoading =
    isGuest &&
    guestItems.length > 0 &&
    (guestLoadStatus === 'idle' || guestLoadStatus === 'loading');

  if (guestIsLoading) {
    return (
      <main className='mx-auto max-w-7xl px-5 py-10 lg:px-8'>
        <p className='text-sm text-neutral-600'>Loading your cart...</p>
      </main>
    );
  }

  const items = isCustomer ? (customerCart.items ?? []) : guestResolvedItems;
  const subtotal = isCustomer
    ? (customerCart.pricing?.subtotal ?? 0)
    : guestSubtotal;

  const isClearingCart =
    isCustomer && actionStatus === 'loading' && actionOperation === 'clear';

  const clearCartError =
    isCustomer && actionStatus !== 'loading' && actionOperation === 'clear'
      ? actionError
      : null;

  return (
    <main className='mx-auto max-w-7xl px-5 py-10 lg:px-8'>
      <div className='flex items-end justify-between gap-4'>
        <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl'>
          Shopping Cart
        </h1>
        <div className='flex items-center gap-4'>
          <p className='text-sm text-neutral-500'>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>

          {isCustomer && items.length > 0 && (
            <button
              type='button'
              disabled={
                actionStatus === 'loading' || isCustomerCartRevalidating
              }
              onClick={handleCustomerCartRefresh}
              className='text-sm font-medium underline underline-offset-4 disabled:cursor-not-allowed disabled:text-neutral-400'>
              {isCustomerCartRevalidating ? 'Refreshing...' : 'Refresh cart'}
            </button>
          )}

          {isGuest && items.length > 0 && (
            <button
              type='button'
              disabled={guestLoadStatus === 'refreshing'}
              onClick={handleGuestCartRefresh}
              className='text-sm font-medium underline underline-offset-4 disabled:cursor-not-allowed disabled:text-neutral-400'>
              {guestLoadStatus === 'refreshing'
                ? 'Refreshing...'
                : 'Refresh cart'}
            </button>
          )}

          {items.length > 0 && (
            <button
              type='button'
              disabled={
                (isCustomer &&
                  (actionStatus === 'loading' || isCustomerCartRevalidating)) ||
                (isGuest && guestLoadStatus === 'refreshing')
              }
              onClick={handleClearCart}
              className='text-sm font-medium text-red-700 underline underline-offset-4 disabled:cursor-not-allowed disabled:text-neutral-400'>
              {isClearingCart ? 'Clearing...' : 'Clear Cart'}
            </button>
          )}
        </div>
      </div>

      {isCustomer && mergeStatus === 'failed' && (
        <div
          role='alert'
          className='mt-6 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
          <p className='font-medium'>Your Guest Cart could not be merged.</p>

          <p className='mt-1'>
            {mergeError?.message ?? 'Unable to merge your Guest Cart.'}
          </p>

          <p className='mt-1'>
            Your Guest Cart is still saved. Your Customer Cart below was loaded
            separately so no Guest items were silently discarded.
          </p>
        </div>
      )}

      {isCustomer && revalidationStatus === 'loading' && (
        <div
          aria-live='polite'
          className='mt-6 border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600'>
          Refreshing current cart prices and availability...
        </div>
      )}

      {isCustomer && revalidationStatus === 'failed' && (
        <div
          role='alert'
          className='mt-6 flex flex-wrap items-center justify-between gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          <p>
            {revalidationError?.message ??
              'Unable to refresh current cart pricing and availability.'}
          </p>

          <button
            type='button'
            onClick={handleCustomerCartRefresh}
            className='font-medium underline underline-offset-4'>
            Try again
          </button>
        </div>
      )}

      {customerCartHasIssues && (
        <div className='mt-6 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
          <p className='font-medium'>Some cart items need your attention.</p>

          <p className='mt-1'>
            Review the highlighted items below. Unavailable items can still be
            removed from your cart.
          </p>
        </div>
      )}

      {clearCartError && (
        <div
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {clearCartError.message ?? 'Unable to clear your cart.'}
        </div>
      )}

      {isGuest && guestLoadStatus === 'refreshing' && (
        <div
          aria-live='polite'
          className='mt-6 border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600'>
          Refreshing current cart prices and availability...
        </div>
      )}

      {isGuest && guestLoadStatus === 'partial' && (
        <div className='mt-6 flex flex-wrap items-center justify-between gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
          <p>
            Some cart items could not be confirmed with current product
            information. Previously loaded details may still be shown.
          </p>
          <button
            type='button'
            onClick={handleGuestCartRefresh}
            className='font-medium underline underline-offset-4'>
            Try again
          </button>
        </div>
      )}

      {isGuest && guestPriceChanges.length > 0 && (
        <div
          aria-live='polite'
          className='mt-6 border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800'>
          <p className='font-medium'>
            Pricing was updated while these items were in your cart.
          </p>

          <ul className='mt-2 space-y-1'>
            {guestPriceChanges.map((change) => (
              <li key={change.productId}>
                {change.productName}: {formatInrFromPaise(change.previousPrice)}{' '}
                → {formatInrFromPaise(change.currentPrice)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length === 0 ? (
        <section className='mt-8 border border-neutral-200 px-6 py-12 text-center'>
          <h2 className='text-2xl font-semibold'>Your cart is empty</h2>
          <p className='mt-3 text-sm text-neutral-600'>
            Browse the store and add products you want to keep here.
          </p>
          <Link
            to='/shop'
            className='mt-6 inline-flex bg-black px-6 py-3 text-sm font-medium text-white'>
            Start shopping
          </Link>
        </section>
      ) : (
        <div className='mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start'>
          <section className='border-y border-neutral-200 py-6'>
            {items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                canEditQuantity={
                  isGuest
                    ? guestLoadStatus !== 'refreshing'
                    : actionStatus !== 'loading' && !isCustomerCartRevalidating
                }
                quantityBlocked={
                  item.availability?.isAvailable === false ||
                  (item.issues?.length ?? 0) > 0
                }
                canRemove={
                  isGuest ||
                  (actionStatus !== 'loading' && !isCustomerCartRevalidating)
                }
                isUpdatingQuantity={
                  isCustomer &&
                  actionStatus === 'loading' &&
                  actionItemId === item.id &&
                  actionOperation === 'quantity'
                }
                isRemoving={
                  isCustomer &&
                  actionStatus === 'loading' &&
                  actionItemId === item.id &&
                  actionOperation === 'remove'
                }
                itemActionError={
                  isCustomer &&
                  actionStatus !== 'loading' &&
                  actionItemId === item.id
                    ? actionError
                    : null
                }
                onQuantityChange={handleQuantityChange}
                onRemove={handleRemoveItem}
              />
            ))}
          </section>

          <aside className='border border-neutral-200 p-6 lg:sticky lg:top-6'>
            <h2 className='text-lg font-semibold'>Order Summary</h2>
            <div className='mt-5 flex justify-between border-b border-neutral-200 pb-5'>
              <span className='text-sm text-neutral-600'>Subtotal</span>
              <span className='font-semibold'>
                {formatInrFromPaise(subtotal)}
              </span>
            </div>
            <p className='mt-4 text-xs leading-5 text-neutral-500'>
              Prices shown use the latest product pricing successfully resolved
              for this cart view. Refresh any item that needs attention.
            </p>
            <Link
              to='/shop'
              className='mt-6 inline-flex w-full justify-center border border-neutral-300 px-5 py-3 text-sm font-medium hover:border-black'>
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}

export default CartPage;
