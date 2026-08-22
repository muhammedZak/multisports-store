import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';
import { Pagination } from '../../components/shared/Pagination.jsx';

import { AdminInventoryFilters } from '../../features/inventory/components/AdminInventoryFilters.jsx';
import { AdminInventoryTable } from '../../features/inventory/components/AdminInventoryTable.jsx';

import { useAdminInventories } from '../../features/inventory/hooks/useAdminInventories.js';

function AdminInventoryPage() {
  const inventory = useAdminInventories();

  function getSportLabel(value) {
    return (
      inventory.sports.find((sport) => sport.value === value)?.label ?? value
    );
  }

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Stock management'
        title='Inventory'
        description='View exact stock positions for simple Products and Product Variants.'
      />

      {inventory.referencesError ? (
        <Alert
          variant='danger'
          title='Catalog references unavailable'
          className='mt-6'>
          {inventory.referencesError.message}
        </Alert>
      ) : null}

      <AdminInventoryFilters model={inventory} />

      {inventory.listError ? (
        <Alert
          variant='danger'
          title='Unable to load Inventory'
          className='mt-6'>
          {inventory.listError.message}
        </Alert>
      ) : null}

      {inventory.loading ? (
        <div className='mt-6 space-y-3'>
          <Skeleton className='h-20 w-full' />
          <Skeleton className='h-20 w-full' />
          <Skeleton className='h-20 w-full' />
        </div>
      ) : null}

      {!inventory.loading &&
      inventory.listError &&
      inventory.inventories.length === 0 ? (
        <Button
          type='button'
          onClick={inventory.loadInventories}
          className='mt-5'>
          Try again
        </Button>
      ) : null}

      {!inventory.loading &&
      !inventory.listError &&
      inventory.inventories.length === 0 ? (
        <section className='mt-6 border-y border-[var(--color-border)] py-14 text-center'>
          <h2 className='mb-0 text-2xl font-black tracking-[-0.03em]'>
            No Inventory positions found
          </h2>

          <p className='mx-auto mt-3 mb-0 max-w-md text-sm leading-6 text-[var(--color-muted)]'>
            Try changing or clearing the current filters.
          </p>

          <Button
            type='button'
            className='mt-5'
            onClick={inventory.resetFilters}>
            Clear filters
          </Button>
        </section>
      ) : null}

      {!inventory.loading && inventory.inventories.length > 0 ? (
        <>
          <div className='mt-6'>
            <AdminInventoryTable
              inventories={inventory.inventories}
              getSportLabel={getSportLabel}
            />
          </div>

          <Pagination
            page={inventory.meta.page}
            totalPages={inventory.meta.totalPages}
            totalItems={inventory.meta.totalItems}
            itemLabel='inventory position'
            loading={inventory.loading}
            onPageChange={inventory.changePage}
          />
        </>
      ) : null}
    </main>
  );
}

export default AdminInventoryPage;
