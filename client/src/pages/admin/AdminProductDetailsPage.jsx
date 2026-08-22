import { Link, useLocation, useParams } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';

import { AdminProductDetailsView } from '../../features/products/components/AdminProductDetailsView.jsx';

import { useAdminProductDetails } from '../../features/products/hooks/useAdminProductDetails.js';

function AdminProductDetailsPage() {
  const { productId } = useParams();

  const location = useLocation();

  const details = useAdminProductDetails({
    productId,

    initialMessage: location.state?.message ?? '',
  });

  if (details.loading) {
    return (
      <main className='p-5 sm:p-6'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='mt-8 h-80 w-full' />
      </main>
    );
  }

  if (details.error && !details.product) {
    return (
      <main className='p-5 sm:p-6'>
        <AdminPageHeader
          eyebrow='Product details'
          title='Product unavailable'
          backTo='/admin/products'
          backLabel='Products'
        />

        <Alert variant='danger' className='mt-6'>
          {details.error.message}
        </Alert>

        {details.error.code !== 'PRODUCT_NOT_FOUND' ? (
          <Button type='button' className='mt-5' onClick={details.loadProduct}>
            Try again
          </Button>
        ) : null}
      </main>
    );
  }

  const { product } = details;

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Product details'
        title={product.name}
        description={`${product.brand} · ${product.sport}`}
        backTo='/admin/products'
        backLabel='Products'
        action={
          <div className='flex flex-wrap gap-3'>
            <Link
              to={`/admin/products/${product.id}/edit`}
              className='inline-flex min-h-10 items-center border border-[var(--color-border-strong)] px-4 text-sm font-semibold hover:border-[var(--color-ink)]'>
              Edit Product
            </Link>

            <Button
              type='button'
              disabled={details.statusUpdating}
              onClick={details.changeStatus}
              variant={product.isActive ? 'secondary' : 'primary'}
              className={product.isActive ? 'text-[var(--color-danger)]' : ''}>
              {details.statusUpdating
                ? 'Updating...'
                : product.isActive
                  ? 'Deactivate'
                  : 'Activate'}
            </Button>
          </div>
        }
      />

      <div className='mt-5'>
        <Badge variant={product.isActive ? 'success' : 'neutral'}>
          {product.isActive ? 'Active Product' : 'Inactive Product'}
        </Badge>
      </div>

      {details.message ? (
        <Alert variant='success' className='mt-6'>
          {details.message}
        </Alert>
      ) : null}

      {details.error ? (
        <Alert variant='danger' className='mt-6'>
          <p className='mb-0'>{details.error.message}</p>

          {details.error.fields?.categoryId ? (
            <p className='mt-1 mb-0'>{details.error.fields.categoryId}</p>
          ) : null}
        </Alert>
      ) : null}

      <AdminProductDetailsView product={product} />
    </main>
  );
}

export default AdminProductDetailsPage;
