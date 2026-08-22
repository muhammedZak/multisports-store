import { useParams } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';

import { AdminProductForm } from '../../features/products/components/AdminProductForm.jsx';

import { useAdminProductForm } from '../../features/products/hooks/useAdminProductForm.js';

function AdminProductFormPage() {
  const { productId } = useParams();

  const productForm = useAdminProductForm(productId);

  if (productForm.loading) {
    return (
      <main className='p-5 sm:p-6'>
        <Skeleton className='h-8 w-52' />

        <Skeleton className='mt-8 h-96 w-full' />
      </main>
    );
  }

  if (productForm.loadError) {
    return (
      <main className='p-5 sm:p-6'>
        <AdminPageHeader
          eyebrow='Catalog management'
          title='Product unavailable'
          backTo='/admin/products'
          backLabel='Products'
        />

        <Alert variant='danger' className='mt-6'>
          {productForm.loadError.message}
        </Alert>
      </main>
    );
  }

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Catalog management'
        title={productForm.editMode ? 'Edit Product' : 'Add Product'}
        description={
          productForm.editMode
            ? 'Update catalog-owned Product information, images and Variants. Product status is managed separately.'
            : 'Create the catalog Product, initial Inventory and initial images.'
        }
        backTo={
          productForm.editMode
            ? `/admin/products/${productId}`
            : '/admin/products'
        }
        backLabel={productForm.editMode ? 'Product details' : 'Products'}
      />

      {productForm.referencesError ? (
        <Alert
          variant='danger'
          title='Catalog references unavailable'
          className='mt-6'>
          {productForm.referencesError.message}
        </Alert>
      ) : null}

      {productForm.formError ? (
        <Alert variant='danger' className='mt-6'>
          {productForm.formError.message}
        </Alert>
      ) : null}

      <AdminProductForm model={productForm} productId={productId} />
    </main>
  );
}

export default AdminProductFormPage;
