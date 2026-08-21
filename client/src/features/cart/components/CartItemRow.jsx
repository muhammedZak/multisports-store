import { Link } from 'react-router';

import { Alert } from '../../../components/ui/Alert.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';

import { formatInrFromPaise } from '../../../utils/money.js';

import { STOCK_STATE_PRESENTATION } from '../cart.constants.js';

import { formatCartOptionName } from '../cart.utils.js';

import { CartQuantityControl } from './CartQuantityControl.jsx';

export function CartItemRow({
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

  const stockPresentation =
    STOCK_STATE_PRESENTATION[item.availability?.stockState] ?? null;

  const canDecrease =
    canEditQuantity &&
    !quantityBlocked &&
    !isUpdatingQuantity &&
    item.quantity > 1;

  const canIncrease =
    canEditQuantity &&
    !quantityBlocked &&
    !isUpdatingQuantity &&
    Boolean(item.product?.name) &&
    item.unitPrice !== null &&
    item.availability?.stockState !== 'out_of_stock';

  return (
    <article className='border-b border-[var(--color-border)] py-7 first:pt-0 last:border-b-0 last:pb-0'>
      <div className='grid gap-5 sm:grid-cols-[128px_minmax(0,1fr)] lg:grid-cols-[150px_minmax(0,1fr)]'>
        <div className='aspect-square overflow-hidden bg-[var(--color-surface)]'>
          {image?.url ? (
            <img
              src={image.url}
              alt={image.altText || productName}
              className='h-full w-full object-cover'
            />
          ) : (
            <div className='flex h-full items-center justify-center border border-[var(--color-border)] px-3 text-center text-xs text-[var(--color-muted)]'>
              No image available
            </div>
          )}
        </div>

        <div className='min-w-0'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
            <div className='min-w-0'>
              {item.product?.name ? (
                <Link
                  to={`/products/${item.product.id}`}
                  className='text-lg font-black leading-6 tracking-[-0.02em] hover:underline hover:underline-offset-4'>
                  {productName}
                </Link>
              ) : (
                <h2 className='mb-0 text-lg font-black leading-6 tracking-[-0.02em]'>
                  {productName}
                </h2>
              )}

              {item.product?.brand ? (
                <p className='mt-1 mb-0 text-sm text-[var(--color-muted)]'>
                  {item.product.brand}
                </p>
              ) : null}
            </div>

            <div className='shrink-0 text-left sm:text-right'>
              <p className='mb-0 text-sm font-bold ds-tabular-nums'>
                {formatInrFromPaise(item.lineTotal)}
              </p>

              <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
                {formatInrFromPaise(item.unitPrice)} each
              </p>
            </div>
          </div>

          {options.length > 0 ? (
            <dl className='mt-4 flex flex-wrap gap-x-6 gap-y-2'>
              {options.map(([name, value]) => (
                <div key={name} className='flex items-center gap-1.5 text-sm'>
                  <dt className='text-[var(--color-muted)]'>
                    {formatCartOptionName(name)}
                  </dt>

                  <dd className='m-0 font-semibold'>{String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {item.variant && options.length === 0 ? (
            <p className='mt-3 mb-0 text-sm text-[var(--color-muted)]'>
              Selected option unavailable
            </p>
          ) : null}

          {stockPresentation ? (
            <div className='mt-3'>
              <Badge variant={stockPresentation.variant}>
                {stockPresentation.label}
              </Badge>
            </div>
          ) : null}

          <div className='mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
            <CartQuantityControl
              productName={productName}
              quantity={item.quantity}
              canDecrease={canDecrease}
              canIncrease={canIncrease}
              isUpdating={isUpdatingQuantity}
              quantityBlocked={quantityBlocked}
              onDecrease={() => onQuantityChange(item, item.quantity - 1)}
              onIncrease={() => onQuantityChange(item, item.quantity + 1)}
            />

            <Button
              type='button'
              variant='quiet'
              size='sm'
              disabled={!canRemove || isRemoving}
              onClick={() => onRemove(item)}
              className='self-start text-[var(--color-danger)] sm:self-auto'>
              {isRemoving ? 'Removing...' : 'Remove'}
            </Button>
          </div>

          {itemActionError ? (
            <Alert variant='danger' className='mt-4'>
              {itemActionError.message ?? 'Unable to update this cart item.'}
            </Alert>
          ) : null}

          {item.issues?.map((issue, index) => (
            <Alert
              key={`${item.id}-issue-${index}`}
              variant='warning'
              className='mt-3'>
              {issue.message}
            </Alert>
          ))}
        </div>
      </div>
    </article>
  );
}
