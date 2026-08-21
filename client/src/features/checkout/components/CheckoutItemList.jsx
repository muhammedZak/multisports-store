import { Alert } from '../../../components/ui/Alert.jsx';

import { formatInrFromPaise } from '../../../utils/money.js';

import { formatCheckoutOptionName } from '../checkout.utils.js';

function CheckoutItem({ item }) {
  const options = Object.entries(item.variant?.options ?? {});

  return (
    <article className='border-b border-[var(--color-border)] py-5 last:border-b-0'>
      <div className='flex items-start justify-between gap-5'>
        <div className='min-w-0'>
          <p className='mb-0 font-bold tracking-[-0.01em]'>
            {item.product?.name ?? 'Unavailable product'}
          </p>

          {item.product?.brand ? (
            <p className='mt-1 mb-0 text-sm text-[var(--color-muted)]'>
              {item.product.brand}
            </p>
          ) : null}

          {options.length > 0 ? (
            <dl className='mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm'>
              {options.map(([name, value]) => (
                <div key={name} className='flex gap-1.5'>
                  <dt className='text-[var(--color-muted)]'>
                    {formatCheckoutOptionName(name)}
                  </dt>

                  <dd className='m-0 font-semibold'>{String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <p className='mt-3 mb-0 text-sm text-[var(--color-muted)]'>
            Quantity:{' '}
            <span className='font-semibold text-[var(--color-ink)]'>
              {item.quantity}
            </span>
          </p>

          {item.issues?.map((issue, index) => (
            <Alert
              key={`${item.id}-issue-${index}`}
              variant='warning'
              className='mt-3'>
              {issue.message}
            </Alert>
          ))}
        </div>

        <div className='shrink-0 text-right'>
          <p className='mb-0 font-bold ds-tabular-nums'>
            {formatInrFromPaise(item.pricing?.lineTotal)}
          </p>

          <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
            {formatInrFromPaise(item.pricing?.unitPrice)} each
          </p>
        </div>
      </div>
    </article>
  );
}

export function CheckoutItemList({ items = [] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className='mt-5 border-y border-[var(--color-border)]'>
      {items.map((item) => (
        <CheckoutItem key={item.id} item={item} />
      ))}
    </div>
  );
}
