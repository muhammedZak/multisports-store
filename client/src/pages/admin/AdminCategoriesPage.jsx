import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';

import { AdminCategoryFilters } from '../../features/categories/components/AdminCategoryFilters.jsx';
import { AdminCategoryForm } from '../../features/categories/components/AdminCategoryForm.jsx';
import { AdminCategoryTable } from '../../features/categories/components/AdminCategoryTable.jsx';

import { useAdminCategories } from '../../features/categories/hooks/useAdminCategories.js';

function AdminCategoriesPage() {
  const categories = useAdminCategories();

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Catalog management'
        title='Categories'
        description='Manage the Categories used to organize Products within each supported Sport.'
      />

      {categories.message ? (
        <Alert variant='success' className='mt-6'>
          {categories.message}
        </Alert>
      ) : null}

      {categories.sportsError ? (
        <Alert variant='danger' title='Unable to load Sports' className='mt-6'>
          {categories.sportsError.message}
        </Alert>
      ) : null}

      <AdminCategoryForm model={categories} />

      <section className='mt-10'>
        <div>
          <h2 className='mb-0 text-lg font-black tracking-[-0.02em]'>
            Category list
          </h2>

          <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
            Search and filter active or inactive Categories.
          </p>
        </div>

        <AdminCategoryFilters model={categories} />

        {categories.listError ? (
          <Alert
            variant='danger'
            title='Unable to load Categories'
            className='mt-5'>
            {categories.listError.message}
          </Alert>
        ) : null}

        {categories.loading ? (
          <div className='mt-6 space-y-3'>
            <Skeleton className='h-14 w-full' />
            <Skeleton className='h-14 w-full' />
            <Skeleton className='h-14 w-full' />
          </div>
        ) : null}

        {!categories.loading &&
        categories.listError &&
        categories.categories.length === 0 ? (
          <Button
            type='button'
            className='mt-5'
            onClick={categories.loadCategories}>
            Try again
          </Button>
        ) : null}

        {!categories.loading &&
        !categories.listError &&
        categories.categories.length === 0 ? (
          <section className='mt-6 border-y border-[var(--color-border)] py-12 text-center'>
            <h3 className='mb-0 text-xl font-black'>No Categories found</h3>

            <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
              Create a Category or change the current filters.
            </p>
          </section>
        ) : null}

        {!categories.loading && categories.categories.length > 0 ? (
          <div className='mt-6'>
            <AdminCategoryTable model={categories} />
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default AdminCategoriesPage;
