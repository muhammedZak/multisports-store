import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Skeleton } from '../../../components/ui/Skeleton.jsx';

import { ProductCard } from './ProductCard.jsx';

function CatalogGridSkeleton() {
  return (
    <div className='grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 md:grid-cols-3 lg:gap-x-6'>
      {Array.from({
        length: 9,
      }).map((_, index) => (
        <div key={index}>
          <Skeleton className='aspect-square w-full' />

          <Skeleton className='mt-3 h-3 w-20' />

          <Skeleton className='mt-2 h-5 w-4/5' />

          <Skeleton className='mt-2 h-4 w-1/2' />

          <Skeleton className='mt-3 h-5 w-24' />
        </div>
      ))}
    </div>
  );
}

export function CatalogProductGrid({
  products,
  loading,
  listError,
  activeFilterCount,

  onRetry,
  onClearFilters,
}) {
  if (loading) {
    return <CatalogGridSkeleton />;
  }

  if (listError) {
    return (
      <Alert
        variant='danger'
        title='Unable to load products'
        actions={
          <Button type='button' variant='secondary' size='sm' onClick={onRetry}>
            Try again
          </Button>
        }>
        {listError.message}
      </Alert>
    );
  }

  if (products.length === 0) {
    const hasFilters = activeFilterCount > 0;

    return (
      <div className='border-y border-[var(--color-border)] py-16 text-center sm:py-20'>
        <p className='mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
          Nothing here
        </p>

        <h2 className='mb-0 text-2xl font-black tracking-[-0.035em]'>
          {hasFilters ? 'No matching products' : 'No products available'}
        </h2>

        <p className='mx-auto mt-3 mb-0 max-w-md text-sm leading-6 text-[var(--color-muted)]'>
          {hasFilters
            ? 'Try changing your search or removing some filters.'
            : 'There are currently no active products available in the catalog.'}
        </p>

        {hasFilters ? (
          <Button type='button' onClick={onClearFilters} className='mt-6'>
            Clear filters
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className='grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 lg:gap-x-6 lg:gap-y-12'>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
