import { Link } from 'react-router';

import { useDispatch, useSelector } from 'react-redux';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

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

import { CUSTOMER_COUPON_WARNING_CODES } from '../../features/cart/cart.constants.js';

import { CartEmptyState } from '../../features/cart/components/CartEmptyState.jsx';
import { CartFeedback } from '../../features/cart/components/CartFeedback.jsx';
import { CartItemRow } from '../../features/cart/components/CartItemRow.jsx';
import { CartSummary } from '../../features/cart/components/CartSummary.jsx';

import { useCartCoupons } from '../../features/cart/hooks/useCartCoupons.js';
import { useGuestCartResolution } from '../../features/cart/hooks/useGuestCartResolution.js';

function CartPageLoading({ message = 'Loading your Cart...' }) {
  return (
    <main className='ds-container py-10 lg:py-12'>
      <p className='mb-6 text-sm font-semibold text-[var(--color-muted)]'>
        {message}
      </p>

      <div className='grid gap-10 lg:grid-cols-[minmax(0,1fr)_330px]'>
        <div className='space-y-6'>
          {Array.from({
            length: 2,
          }).map((_, index) => (
            <div
              key={index}
              className='grid gap-5 border-b border-[var(--color-border)] pb-6 sm:grid-cols-[128px_minmax(0,1fr)]'>
              <Skeleton className='aspect-square w-full' />

              <div>
                <Skeleton className='h-5 w-2/3' />

                <Skeleton className='mt-3 h-4 w-24' />

                <Skeleton className='mt-6 h-10 w-36' />
              </div>
            </div>
          ))}
        </div>

        <div>
          <Skeleton className='h-6 w-28' />

          <Skeleton className='mt-6 h-4 w-full' />

          <Skeleton className='mt-6 h-12 w-full' />

          <Skeleton className='mt-3 h-11 w-full' />
        </div>
      </div>
    </main>
  );
}

function CartPage() {
  const dispatch = useDispatch();

  const {
    initialized: authInitialized,

    user,
  } = useSelector((state) => state.auth);

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

  const isCustomer = user?.role === 'customer';

  const isGuest = !user;

  const isCustomerCartRevalidating =
    isCustomer && revalidationStatus === 'loading';

  const customerCartHasIssues =
    isCustomer && (customerCart.issues?.length ?? 0) > 0;

  const guest = useGuestCartResolution({
    authInitialized,

    isGuest,

    guestItems,
  });

  const coupon = useCartCoupons({
    isGuest,
    isCustomer,

    userId: user?.id,

    guestItems,

    guestLoadStatus: guest.guestLoadStatus,

    guestReloadKey: guest.guestReloadKey,

    customerCart,

    actionStatus,
    actionError,
    actionOperation,

    revalidationStatus,

    customerCartHasIssues,
  });

  function handleCustomerCartRefresh() {
    if (!isCustomer || !user?.id) {
      return;
    }

    dispatch(revalidateCustomerCart(user.id));
  }

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
    return <CartPageLoading message='Checking your Cart...' />;
  }

  if (user && !isCustomer) {
    return (
      <main className='ds-container py-16 lg:py-20'>
        <div className='max-w-xl border-t border-[var(--color-border)] pt-8'>
          <p className='mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-muted)]'>
            Shopping Cart
          </p>

          <h1 className='mb-0 text-3xl font-black tracking-[-0.04em]'>
            Cart unavailable
          </h1>

          <p className='mt-3 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
            Cart shopping is available to Guests and Customer accounts.
          </p>

          <Link
            to='/shop'
            className='mt-6 inline-flex min-h-11 items-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-5 text-sm font-bold text-white'>
            Back to shop
          </Link>
        </div>
      </main>
    );
  }

  if (isCustomer && mergeStatus === 'loading') {
    return <CartPageLoading message='Merging your Guest Cart...' />;
  }

  if (isCustomer && (!customerCartInitialized || loadStatus === 'loading')) {
    return <CartPageLoading />;
  }

  if (isCustomer && loadStatus === 'failed') {
    return (
      <main className='ds-container py-16'>
        <div className='max-w-xl space-y-4'>
          {mergeStatus === 'failed' ? (
            <Alert
              variant='warning'
              title='Your Guest Cart could not be merged'>
              <p className='mb-1'>
                {mergeError?.message ?? 'Unable to merge your Guest Cart.'}
              </p>

              <p className='mb-0'>
                Your Guest Cart has been kept and was not discarded.
              </p>
            </Alert>
          ) : null}

          <Alert variant='danger' title='Unable to load Cart'>
            {loadError?.message ?? 'Unable to load your Cart.'}
          </Alert>

          <Button
            type='button'
            onClick={() => dispatch(loadCustomerCart(user.id))}>
            Try again
          </Button>
        </div>
      </main>
    );
  }

  const guestIsLoading =
    isGuest &&
    guestItems.length > 0 &&
    (guest.guestLoadStatus === 'idle' || guest.guestLoadStatus === 'loading');

  if (guestIsLoading) {
    return <CartPageLoading />;
  }

  const items = isCustomer ? (customerCart.items ?? []) : guest.resolvedItems;

  const baseSubtotal = isCustomer
    ? (customerCart.pricing?.subtotal ?? 0)
    : guest.subtotal;

  const customerCoupon = isCustomer ? (customerCart.coupon ?? null) : null;

  const customerCartWarnings = isCustomer ? (customerCart.warnings ?? []) : [];

  const customerHasInvalidSavedCoupon =
    isCustomer &&
    !customerCoupon &&
    customerCartWarnings.some((warning) =>
      CUSTOMER_COUPON_WARNING_CODES.has(warning.code),
    );

  const summarySubtotal = isCustomer
    ? (customerCart.pricing?.subtotal ?? 0)
    : (coupon.guestCouponPricing?.subtotal ?? baseSubtotal);

  const summaryDiscountAmount = isCustomer
    ? (customerCart.pricing?.discountAmount ?? 0)
    : (coupon.guestCouponPricing?.discountAmount ?? 0);

  const summaryTotalAmount = isCustomer
    ? (customerCart.pricing?.totalAmount ?? summarySubtotal)
    : (coupon.guestCouponPricing?.totalAmount ?? baseSubtotal);

  const hasCouponPricing = isCustomer
    ? Boolean(customerCoupon)
    : Boolean(coupon.guestCouponPreview);

  const isClearingCart =
    isCustomer && actionStatus === 'loading' && actionOperation === 'clear';

  const clearCartError =
    isCustomer && actionStatus !== 'loading' && actionOperation === 'clear'
      ? actionError
      : null;

  const couponViewModel = {
    ...coupon,

    customerHasInvalidSavedCoupon,
  };

  return (
    <main className='ds-container py-8 lg:py-12'>
      <header className='border-b border-[var(--color-border)] pb-7'>
        <div className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <p className='mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted)]'>
              Your bag
            </p>

            <h1 className='mb-0 text-3xl font-black tracking-[-0.045em] sm:text-4xl lg:text-5xl'>
              Shopping Cart
            </h1>

            <p className='mt-3 mb-0 text-sm text-[var(--color-muted)]'>
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
          </div>

          {items.length > 0 ? (
            <div className='flex flex-wrap gap-1 sm:justify-end'>
              {isCustomer ? (
                <Button
                  type='button'
                  variant='quiet'
                  size='sm'
                  disabled={
                    actionStatus === 'loading' || isCustomerCartRevalidating
                  }
                  onClick={handleCustomerCartRefresh}>
                  {isCustomerCartRevalidating
                    ? 'Refreshing...'
                    : 'Refresh Cart'}
                </Button>
              ) : null}

              {isGuest ? (
                <Button
                  type='button'
                  variant='quiet'
                  size='sm'
                  disabled={guest.guestLoadStatus === 'refreshing'}
                  onClick={guest.refresh}>
                  {guest.guestLoadStatus === 'refreshing'
                    ? 'Refreshing...'
                    : 'Refresh Cart'}
                </Button>
              ) : null}

              <Button
                type='button'
                variant='quiet'
                size='sm'
                disabled={
                  (isCustomer &&
                    (actionStatus === 'loading' ||
                      isCustomerCartRevalidating)) ||
                  (isGuest && guest.guestLoadStatus === 'refreshing')
                }
                onClick={handleClearCart}
                className='text-[var(--color-danger)]'>
                {isClearingCart ? 'Clearing...' : 'Clear Cart'}
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <div className='mt-6'>
        <CartFeedback
          isCustomer={isCustomer}
          isGuest={isGuest}
          mergeStatus={mergeStatus}
          mergeError={mergeError}
          revalidationStatus={revalidationStatus}
          revalidationError={revalidationError}
          customerCartHasIssues={customerCartHasIssues}
          customerCartWarnings={customerCartWarnings}
          clearCartError={clearCartError}
          guestLoadStatus={guest.guestLoadStatus}
          guestPriceChanges={guest.guestPriceChanges}
          onCustomerRefresh={handleCustomerCartRefresh}
          onGuestRefresh={guest.refresh}
        />
      </div>

      {items.length === 0 ? (
        <CartEmptyState />
      ) : (
        <div className='mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start xl:gap-16'>
          <section
            aria-label='Cart items'
            className='border-y border-[var(--color-border)] py-7'>
            {items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                canEditQuantity={
                  isGuest
                    ? guest.guestLoadStatus !== 'refreshing'
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

          <CartSummary
            isCustomer={isCustomer}
            isGuest={isGuest}
            itemsCount={items.length}
            summarySubtotal={summarySubtotal}
            summaryDiscountAmount={summaryDiscountAmount}
            summaryTotalAmount={summaryTotalAmount}
            hasCouponPricing={hasCouponPricing}
            customerCartHasIssues={customerCartHasIssues}
            customerCanCheckout={customerCart.canCheckout}
            coupon={couponViewModel}
          />
        </div>
      )}
    </main>
  );
}

export default CartPage;
