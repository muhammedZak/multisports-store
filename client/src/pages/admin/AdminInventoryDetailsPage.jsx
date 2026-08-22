import { Link, useParams } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';

import { AdminInventoryAdjustmentForm } from '../../features/inventory/components/AdminInventoryAdjustmentForm.jsx';
import { AdminInventoryHistory } from '../../features/inventory/components/AdminInventoryHistory.jsx';
import { InventoryStockBadge } from '../../features/inventory/components/InventoryStockBadge.jsx';

import { useAdminInventoryDetails } from '../../features/inventory/hooks/useAdminInventoryDetails.js';

import { inventoryDateFormatter } from '../../features/inventory/inventory.utils.js';

function AdminInventoryDetailsPage() {
  const { inventoryId } = useParams();

  const details = useAdminInventoryDetails(inventoryId);

  if (details.loading) {
    return (
      <main className='p-5 sm:p-6'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='mt-8 h-80 w-full' />
      </main>
    );
  }

  if (details.error && !details.inventory) {
    return (
      <main className='p-5 sm:p-6'>
        <AdminPageHeader
          eyebrow='Inventory details'
          title='Inventory unavailable'
          backTo='/admin/inventory'
          backLabel='Inventory'
        />

        <Alert variant='danger' className='mt-6'>
          {details.error.message}
        </Alert>

        {details.error.code !== 'INVENTORY_NOT_FOUND' ? (
          <Button
            type='button'
            className='mt-5'
            onClick={details.loadInventory}>
            Try again
          </Button>
        ) : null}
      </main>
    );
  }

  const { inventory } = details;

  const variantOptions = Object.entries(inventory.variant?.options ?? {});

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Inventory details'
        title={inventory.product.name}
        description={`${inventory.product.brand} · ${inventory.product.sport}`}
        backTo='/admin/inventory'
        backLabel='Inventory'
        action={
          <Link
            to={`/admin/products/${inventory.product.id}`}
            className='inline-flex min-h-10 items-center border border-[var(--color-border-strong)] px-4 text-sm font-semibold hover:border-[var(--color-ink)]'>
            View Product
          </Link>
        }
      />

      {details.error ? (
        <Alert variant='danger' className='mt-6'>
          {details.error.message}
        </Alert>
      ) : null}

      <section className='mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4'>
        <div className='border-t border-[var(--color-ink)] pt-4'>
          <p className='mb-0 text-sm text-[var(--color-muted)]'>
            Current stock
          </p>

          <p className='mt-2 mb-0 text-3xl font-black ds-tabular-nums'>
            {inventory.quantity}
          </p>
        </div>

        <div className='border-t border-[var(--color-border)] pt-4'>
          <p className='mb-2 text-sm text-[var(--color-muted)]'>Stock state</p>

          <InventoryStockBadge stockState={inventory.stockState} />
        </div>

        <div className='border-t border-[var(--color-border)] pt-4'>
          <p className='mb-0 text-sm text-[var(--color-muted)]'>
            Product status
          </p>

          <div className='mt-2'>
            <Badge variant={inventory.product.isActive ? 'success' : 'neutral'}>
              {inventory.product.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        <div className='border-t border-[var(--color-border)] pt-4'>
          <p className='mb-0 text-sm text-[var(--color-muted)]'>
            Inventory type
          </p>

          <p className='mt-2 mb-0 font-bold'>
            {inventory.variant ? 'Variant' : 'Simple Product'}
          </p>
        </div>
      </section>

      <div className='mt-10 space-y-10'>
        <AdminInventoryAdjustmentForm model={details} />

        <AdminInventoryHistory model={details} />

        <section className='border-t border-[var(--color-border)] pt-6'>
          <h2 className='mb-0 text-lg font-black'>Product context</h2>

          <dl className='mt-5 grid gap-5 text-sm sm:grid-cols-2'>
            <div>
              <dt className='text-[var(--color-muted)]'>Product</dt>

              <dd className='mt-1 mb-0 font-semibold'>
                {inventory.product.name}
              </dd>
            </div>

            <div>
              <dt className='text-[var(--color-muted)]'>Brand</dt>

              <dd className='mt-1 mb-0 font-semibold'>
                {inventory.product.brand}
              </dd>
            </div>

            <div>
              <dt className='text-[var(--color-muted)]'>Sport</dt>

              <dd className='mt-1 mb-0 capitalize font-semibold'>
                {inventory.product.sport}
              </dd>
            </div>

            <div>
              <dt className='text-[var(--color-muted)]'>Category</dt>

              <dd className='mt-1 mb-0 font-semibold'>
                {inventory.product.category?.name ?? '—'}
              </dd>
            </div>
          </dl>
        </section>

        <section className='border-t border-[var(--color-border)] pt-6'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <h2 className='mb-0 text-lg font-black'>Variant</h2>

              <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
                {inventory.variant
                  ? 'This stock position belongs to one embedded Product Variant.'
                  : 'This is the Product-level stock position for a simple Product.'}
              </p>
            </div>

            {inventory.variant ? (
              <Badge
                variant={inventory.variant.isActive ? 'success' : 'neutral'}>
                {inventory.variant.isActive ? 'Active' : 'Inactive'}
              </Badge>
            ) : null}
          </div>

          {!inventory.variant ? (
            <p className='mt-5 mb-0 font-semibold'>Simple Product</p>
          ) : variantOptions.length === 0 ? (
            <p className='mt-5 mb-0 text-sm text-[var(--color-muted)]'>
              No Variant options recorded.
            </p>
          ) : (
            <dl className='mt-5 border-y border-[var(--color-border)]'>
              {variantOptions.map(([name, value]) => (
                <div
                  key={name}
                  className='grid gap-1 border-b border-[var(--color-border)] py-3 text-sm last:border-b-0 sm:grid-cols-2'>
                  <dt className='font-semibold'>{name}</dt>

                  <dd className='m-0 text-[var(--color-muted)]'>
                    {String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section className='border-t border-[var(--color-border)] pt-6'>
          <h2 className='mb-0 text-lg font-black'>Inventory information</h2>

          <dl className='mt-5 grid gap-5 text-sm sm:grid-cols-2'>
            <div>
              <dt className='text-[var(--color-muted)]'>Inventory ID</dt>

              <dd className='mt-1 mb-0 break-all font-semibold'>
                {inventory.id}
              </dd>
            </div>

            <div>
              <dt className='text-[var(--color-muted)]'>Variant ID</dt>

              <dd className='mt-1 mb-0 break-all font-semibold'>
                {inventory.variant?.id ?? '—'}
              </dd>
            </div>

            <div>
              <dt className='text-[var(--color-muted)]'>Created</dt>

              <dd className='mt-1 mb-0'>
                {inventoryDateFormatter.format(new Date(inventory.createdAt))}
              </dd>
            </div>

            <div>
              <dt className='text-[var(--color-muted)]'>Last updated</dt>

              <dd className='mt-1 mb-0'>
                {inventoryDateFormatter.format(new Date(inventory.updatedAt))}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}

export default AdminInventoryDetailsPage;
