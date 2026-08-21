import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';

import { formatInrFromPaise } from '../../../utils/money.js';

export function CartFeedback({
  isCustomer,
  isGuest,

  mergeStatus,
  mergeError,

  revalidationStatus,
  revalidationError,

  customerCartHasIssues,
  customerCartWarnings,

  clearCartError,

  guestLoadStatus,
  guestPriceChanges,

  onCustomerRefresh,
  onGuestRefresh,
}) {
  return (
    <div className='space-y-3'>
      {isCustomer && mergeStatus === 'failed' ? (
        <Alert variant='warning' title='Your Guest Cart could not be merged'>
          <p className='mb-1'>
            {mergeError?.message ?? 'Unable to merge your Guest Cart.'}
          </p>

          <p className='mb-0'>
            Your Guest Cart is still saved. Your Customer Cart below was loaded
            separately, so no Guest items were silently discarded.
          </p>
        </Alert>
      ) : null}

      {isCustomer && revalidationStatus === 'loading' ? (
        <Alert variant='neutral'>
          Refreshing current Cart prices and availability...
        </Alert>
      ) : null}

      {isCustomer && revalidationStatus === 'failed' ? (
        <Alert
          variant='danger'
          title='Cart refresh failed'
          actions={
            <Button
              type='button'
              variant='secondary'
              size='sm'
              onClick={onCustomerRefresh}>
              Try again
            </Button>
          }>
          {revalidationError?.message ??
            'Unable to refresh current Cart pricing and availability.'}
        </Alert>
      ) : null}

      {customerCartHasIssues ? (
        <Alert variant='warning' title='Some Cart items need your attention'>
          Review the highlighted items below. Unavailable items can still be
          removed from your Cart.
        </Alert>
      ) : null}

      {isCustomer && customerCartWarnings.length > 0 ? (
        <Alert variant='warning' title='Coupon update'>
          <div className='space-y-1'>
            {customerCartWarnings.map((warning, index) => (
              <p key={`${warning.code}-${index}`} className='mb-0'>
                {warning.message}

                {warning.reasonMessage ? ` ${warning.reasonMessage}` : ''}
              </p>
            ))}
          </div>
        </Alert>
      ) : null}

      {clearCartError ? (
        <Alert variant='danger' title='Unable to clear Cart'>
          {clearCartError.message ?? 'Unable to clear your Cart.'}
        </Alert>
      ) : null}

      {isGuest && guestLoadStatus === 'refreshing' ? (
        <Alert variant='neutral'>
          Refreshing current Cart prices and availability...
        </Alert>
      ) : null}

      {isGuest && guestLoadStatus === 'partial' ? (
        <Alert
          variant='warning'
          title='Some Cart items could not be confirmed'
          actions={
            <Button
              type='button'
              variant='secondary'
              size='sm'
              onClick={onGuestRefresh}>
              Try again
            </Button>
          }>
          Previously loaded details may still be shown when a temporary request
          failed.
        </Alert>
      ) : null}

      {isGuest && guestPriceChanges.length > 0 ? (
        <Alert variant='info' title='Pricing changed'>
          <p className='mb-2'>
            Pricing was updated while these items were in your Cart.
          </p>

          <ul className='mb-0 space-y-1 pl-5'>
            {guestPriceChanges.map((change) => (
              <li key={change.productId}>
                {change.productName}: {formatInrFromPaise(change.previousPrice)}{' '}
                → {formatInrFromPaise(change.currentPrice)}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}
    </div>
  );
}
