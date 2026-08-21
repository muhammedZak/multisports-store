import {
  Link,
} from 'react-router';

import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';

export function AddressCard({
  address,

  action,

  actionLoading,

  onSetDefault,

  onRemove,
}) {
  const settingDefault =
    action.type ===
      'default' &&
    action.addressId ===
      address.id;

  const deleting =
    action.type ===
      'delete' &&
    action.addressId ===
      address.id;

  return (
    <article className='border-t border-[var(--color-border)] py-5'>
      <div className='flex items-start justify-between gap-5'>
        <div>
          <div className='flex flex-wrap items-center gap-2'>
            <h2 className='mb-0 text-base font-black tracking-[-0.015em]'>
              {address.fullName}
            </h2>

            {address.isDefault ? (
              <Badge variant='success'>
                Default
              </Badge>
            ) : null}
          </div>

          <div className='mt-3 space-y-1 text-sm leading-6 text-[var(--color-muted)]'>
            <p className='mb-0'>
              {address.address}
            </p>

            <p className='mb-0'>
              {address.city},{' '}
              {address.state}{' '}
              {address.postalCode}
            </p>

            <p className='mb-0'>
              {address.country}
            </p>

            <p className='mt-2 mb-0 font-semibold text-[var(--color-ink-soft)]'>
              {address.phone}
            </p>
          </div>
        </div>
      </div>

      <div className='mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-4'>
        <Link
          to={`/account/addresses/${address.id}/edit`}
          className='inline-flex min-h-9 items-center px-2 text-sm font-semibold underline decoration-[var(--color-border-strong)] underline-offset-4 hover:decoration-[var(--color-ink)]'
        >
          Edit
        </Link>

        {!address.isDefault ? (
          <Button
            type='button'
            variant='quiet'
            size='sm'
            disabled={
              actionLoading
            }
            onClick={() =>
              onSetDefault(
                address.id,
              )
            }
          >
            {settingDefault
              ? 'Setting default...'
              : 'Set default'}
          </Button>
        ) : null}

        <Button
          type='button'
          variant='quiet'
          size='sm'
          disabled={
            actionLoading
          }
          onClick={() =>
            onRemove(address)
          }
          className='text-[var(--color-danger)]'
        >
          {deleting
            ? 'Removing...'
            : 'Remove'}
        </Button>
      </div>
    </article>
  );
}