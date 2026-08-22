import { Link } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';
import { Pagination } from '../../components/shared/Pagination.jsx';

import { AdminProductFilters } from '../../features/products/components/AdminProductFilters.jsx';
import { AdminProductTable } from '../../features/products/components/AdminProductTable.jsx';

import { useAdminProducts } from '../../features/products/hooks/useAdminProducts.js';

function AdminProductsPage() {
  const products = useAdminProducts();

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Catalog management'
        title='Products'
        description='Search, filter, view and edit Products in the store catalog.'
        action={
          <Link
            to='/admin/products/new'
            className='inline-flex min-h-10 items-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-4 text-sm font-bold text-white hover:bg-[#2b2b2b]'>
            Add Product
          </Link>
        }
      />

      {products.referencesError ? (
        <Alert
          variant='danger'
          title='Catalog references unavailable'
          className='mt-6'>
          {products.referencesError.message}
        </Alert>
      ) : null}

      <AdminProductFilters model={products} />

      {products.listError ? (
        <Alert
          variant='danger'
          title='Unable to load Products'
          className='mt-6'>
          {products.listError.message}
        </Alert>
      ) : null}

      {products.loading ? (
        <div className='mt-6 space-y-3'>
          <Skeleton className='h-20 w-full' />
          <Skeleton className='h-20 w-full' />
          <Skeleton className='h-20 w-full' />
        </div>
      ) : null}

      {!products.loading &&
      products.listError &&
      products.products.length === 0 ? (
        <Button type='button' onClick={products.loadProducts} className='mt-5'>
          Try again
        </Button>
      ) : null}

      {!products.loading &&
      !products.listError &&
      products.products.length === 0 ? (
        <section className='mt-6 border-y border-[var(--color-border)] py-14 text-center'>
          <h2 className='mb-0 text-2xl font-black tracking-[-0.03em]'>
            No Products found
          </h2>

          <p className='mx-auto mt-3 mb-0 max-w-md text-sm leading-6 text-[var(--color-muted)]'>
            Try different filters or add your first Product.
          </p>

          <Link
            to='/admin/products/new'
            className='mt-5 inline-flex min-h-11 items-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-5 text-sm font-bold text-white'>
            Add Product
          </Link>
        </section>
      ) : null}

      {!products.loading && products.products.length > 0 ? (
        <>
          <div className='mt-6'>
            <AdminProductTable
              products={products.products}
              sports={products.sports}
            />
          </div>

          <Pagination
            page={products.meta.page}
            totalPages={products.meta.totalPages}
            totalItems={products.meta.totalItems}
            itemLabel='product'
            loading={products.loading}
            onPageChange={products.changePage}
          />
        </>
      ) : null}
    </main>
  );
}

export default AdminProductsPage;
