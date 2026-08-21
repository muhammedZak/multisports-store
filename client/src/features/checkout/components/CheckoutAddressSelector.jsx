import { Link } from 'react-router';

import { Badge } from '../../../components/ui/Badge.jsx';

function AddressOption({
  address,

  selected,
  disabled,

  onSelect,
}) {
  return (
    <label
      className={[
        'block border px-4 py-4 transition-colors',

        selected
          ? 'border-[var(--color-ink)] bg-[var(--color-surface)]'
          : 'border-[var(--color-border)] bg-white hover:border-[var(--color-border-strong)]',

        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      ].join(' ')}>
      <div className='flex items-start gap-3'>
        <input
          type='radio'
          name='shippingAddress'
          checked={selected}
          disabled={disabled}
          onChange={() => onSelect(address.id)}
          className='mt-1 size-4 accent-[var(--color-ink)]'
        />

        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <p className='mb-0 font-bold text-[var(--color-ink)]'>
              {address.fullName}
            </p>

            {address.isDefault ? (
              <Badge variant='success'>Default</Badge>
            ) : null}
          </div>

          <div className='mt-3 space-y-1 text-sm leading-6 text-[var(--color-muted)]'>
            <p className='mb-0'>{address.address}</p>

            <p className='mb-0'>
              {address.city}, {address.state} {address.postalCode}
            </p>

            <p className='mb-0'>{address.country}</p>

            <p className='mb-0 pt-1 font-semibold text-[var(--color-ink-soft)]'>
              {address.phone}
            </p>
          </div>
        </div>
      </div>
    </label>
  );
}

export function CheckoutAddressSelector({
  addresses,

  selectedAddressId,

  disabled,

  onSelect,
}) {
  return (
    <section>
      <div className='flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-4'>
        <div>
          <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
            Delivery
          </p>

          <h2 className='mb-0 text-xl font-black tracking-[-0.025em]'>
            Shipping address
          </h2>

          <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
            Select where this Order should be delivered.
          </p>
        </div>

        <Link
          to='/account/addresses/new'
          state={{
            from: '/checkout',
          }}
          className='text-sm font-semibold underline decoration-[var(--color-border-strong)] underline-offset-4 hover:decoration-[var(--color-ink)]'>
          Add another address
        </Link>
      </div>

      <div className='mt-5 grid gap-3 md:grid-cols-2'>
        {addresses.map((address) => (
          <AddressOption
            key={address.id}
            address={address}
            selected={selectedAddressId === address.id}
            disabled={disabled}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
