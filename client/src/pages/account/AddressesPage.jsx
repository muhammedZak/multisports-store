import { Link } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AccountPageHeader } from '../../features/account/components/AccountPageHeader.jsx';
import { AddressCard } from '../../features/account/components/AddressCard.jsx';

import { useAddressBook } from '../../features/account/hooks/useAddressBook.js';

function AddressesPage() {
  const addressBook = useAddressBook();

  async function handleDelete(address) {
    const confirmed = window.confirm(
      `Remove the saved address for ${address.fullName}?`,
    );

    if (!confirmed) {
      return;
    }

    await addressBook.removeAddress(address.id);
  }

  return (
    <div className='max-w-4xl'>
      <AccountPageHeader
        title='Saved addresses'
        description='Manage the shipping addresses available during Checkout.'
        action={
          <Link
            to='/account/addresses/new'
            className='inline-flex min-h-10 items-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-4 text-sm font-bold text-white hover:bg-[#2b2b2b]'>
            Add address
          </Link>
        }
      />

      {addressBook.message ? (
        <Alert variant='success' className='mt-6'>
          {addressBook.message}
        </Alert>
      ) : null}

      {addressBook.error ? (
        <Alert variant='danger' className='mt-6'>
          {addressBook.error.message}
        </Alert>
      ) : null}

      {addressBook.loading ? (
        <div className='mt-8 grid gap-x-8 md:grid-cols-2'>
          <Skeleton className='h-52 w-full' />

          <Skeleton className='hidden h-52 w-full md:block' />
        </div>
      ) : null}

      {!addressBook.loading &&
      addressBook.error &&
      addressBook.addresses.length === 0 ? (
        <Button
          type='button'
          onClick={addressBook.loadAddresses}
          className='mt-5'>
          Try again
        </Button>
      ) : null}

      {!addressBook.loading &&
      !addressBook.error &&
      addressBook.addresses.length === 0 ? (
        <section className='mt-8 border-y border-[var(--color-border)] py-14 text-center'>
          <p className='mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
            Delivery
          </p>

          <h2 className='mb-0 text-2xl font-black tracking-[-0.03em]'>
            No saved addresses
          </h2>

          <p className='mx-auto mt-3 mb-0 max-w-md text-sm leading-6 text-[var(--color-muted)]'>
            Add your first shipping address so it is ready during Checkout.
          </p>

          <Link
            to='/account/addresses/new'
            className='mt-6 inline-flex min-h-11 items-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-5 text-sm font-bold text-white'>
            Add your first address
          </Link>
        </section>
      ) : null}

      {!addressBook.loading && addressBook.addresses.length > 0 ? (
        <section className='mt-8 grid gap-x-8 md:grid-cols-2'>
          {addressBook.addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              action={addressBook.action}
              actionLoading={addressBook.actionLoading}
              onSetDefault={addressBook.setDefault}
              onRemove={handleDelete}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

export default AddressesPage;
