import { useCallback, useEffect, useState } from 'react';

import {
  createAdminCategory,
  fetchAdminCategories,
  fetchSports,
  updateAdminCategory,
  updateAdminCategoryStatus,
} from '../../api/categoryApi.js';

import { normalizeApiError } from '../../api/errors.js';

const EMPTY_FILTERS = {
  q: '',
  sport: '',
  status: '',
};

const EMPTY_FORM = {
  name: '',
  sport: '',
  isActive: true,
};

function validateCategoryForm(form) {
  const fields = {};

  const name = form.name.trim();

  if (!name) {
    fields.name = 'Category name is required.';
  }

  if (!form.sport) {
    fields.sport = 'Sport is required.';
  }

  return {
    fields,

    normalized: {
      name,
      sport: form.sport,
    },
  };
}

function AdminCategoriesPage() {
  const [sports, setSports] = useState([]);
  const [categories, setCategories] = useState([]);

  const [filterForm, setFilterForm] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [sportsLoading, setSportsLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const [listError, setListError] = useState(null);
  const [sportsError, setSportsError] = useState(null);
  const [formError, setFormError] = useState(null);

  const [message, setMessage] = useState('');

  const editMode = Boolean(editingCategoryId);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setListError(null);

    try {
      const items = await fetchAdminCategories(appliedFilters);

      setCategories(items);
    } catch (requestError) {
      setListError(
        normalizeApiError(
          requestError,
          'Unable to load categories. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    async function loadSports() {
      setSportsLoading(true);
      setSportsError(null);

      try {
        const items = await fetchSports();

        setSports(items);
      } catch (requestError) {
        setSportsError(
          normalizeApiError(
            requestError,
            'Unable to load sports. Please try again.',
          ),
        );
      } finally {
        setSportsLoading(false);
      }
    }

    loadSports();
  }, []);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilterForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleFilterSubmit(event) {
    event.preventDefault();

    setAppliedFilters({
      q: filterForm.q.trim(),
      sport: filterForm.sport,
      status: filterForm.status,
    });
  }

  function handleResetFilters() {
    setFilterForm(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }

  function handleFormChange(event) {
    const { name, value, checked, type } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));

    setFormError(null);
    setMessage('');
  }

  function resetCategoryForm() {
    setEditingCategoryId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function handleStartEdit(category) {
    setEditingCategoryId(category.id);

    setForm({
      name: category.name,
      sport: category.sport,
      isActive: category.isActive,
    });

    setFormError(null);
    setMessage('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  async function handleCategorySubmit(event) {
    event.preventDefault();

    setFormError(null);
    setMessage('');

    const { fields, normalized } = validateCategoryForm(form);

    if (Object.keys(fields).length > 0) {
      setFormError({
        code: 'VALIDATION_ERROR',
        message: 'Please correct the invalid fields.',
        fields,
      });

      return;
    }

    setSaving(true);

    try {
      if (editMode) {
        await updateAdminCategory(editingCategoryId, {
          name: normalized.name,
          sport: normalized.sport,
        });

        setMessage('Category updated successfully.');
      } else {
        await createAdminCategory({
          name: normalized.name,
          sport: normalized.sport,
          isActive: form.isActive,
        });

        setMessage('Category created successfully.');
      }

      resetCategoryForm();

      await loadCategories();
    } catch (requestError) {
      setFormError(
        normalizeApiError(
          requestError,
          editMode
            ? 'Unable to update this category.'
            : 'Unable to create this category.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(category) {
    const nextIsActive = !category.isActive;

    if (!nextIsActive) {
      const confirmed = window.confirm(
        `Deactivate "${category.name}"? It will no longer appear in public category results.`,
      );

      if (!confirmed) {
        return;
      }
    }

    setStatusUpdatingId(category.id);
    setListError(null);
    setMessage('');

    try {
      await updateAdminCategoryStatus(category.id, nextIsActive);

      setMessage(
        nextIsActive
          ? 'Category activated successfully.'
          : 'Category deactivated successfully.',
      );

      if (editingCategoryId === category.id) {
        resetCategoryForm();
      }

      await loadCategories();
    } catch (requestError) {
      setListError(
        normalizeApiError(
          requestError,
          nextIsActive
            ? 'Unable to activate this category.'
            : 'Unable to deactivate this category.',
        ),
      );
    } finally {
      setStatusUpdatingId(null);
    }
  }

  function getSportLabel(sportValue) {
    return (
      sports.find((sport) => sport.value === sportValue)?.label || sportValue
    );
  }

  return (
    <main className='p-5 sm:p-6'>
      <div>
        <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
          Catalog management
        </p>

        <h1 className='mt-3 text-3xl font-semibold'>Categories</h1>

        <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>
          Manage the categories used to organize products within each supported
          sport.
        </p>
      </div>

      {message && (
        <div
          role='status'
          className='mt-6 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
          {message}
        </div>
      )}

      {sportsError && (
        <div
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {sportsError.message}
        </div>
      )}

      <section className='mt-8 border border-neutral-200 p-5'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <h2 className='text-lg font-semibold'>
              {editMode ? 'Edit category' : 'Create category'}
            </h2>

            <p className='mt-1 text-sm text-neutral-600'>
              {editMode
                ? 'Update the category name or sport.'
                : 'Add a category under one of the supported sports.'}
            </p>
          </div>

          {editMode && (
            <button
              type='button'
              disabled={saving}
              onClick={resetCategoryForm}
              className='text-sm font-medium underline underline-offset-4 disabled:opacity-50'>
              Cancel edit
            </button>
          )}
        </div>

        <form
          onSubmit={handleCategorySubmit}
          className='mt-6 grid gap-5 lg:grid-cols-2'>
          <div>
            <label htmlFor='name' className='mb-2 block text-sm font-medium'>
              Category name
            </label>

            <input
              id='name'
              name='name'
              type='text'
              required
              disabled={saving}
              value={form.name}
              onChange={handleFormChange}
              placeholder='Football Boots'
              className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
            />

            {formError?.fields?.name && (
              <p className='mt-2 text-sm text-red-600'>
                {formError.fields.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor='sport' className='mb-2 block text-sm font-medium'>
              Sport
            </label>

            <select
              id='sport'
              name='sport'
              required
              disabled={saving || sportsLoading}
              value={form.sport}
              onChange={handleFormChange}
              className='w-full border border-neutral-300 bg-white px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'>
              <option value=''>
                {sportsLoading ? 'Loading sports...' : 'Select sport'}
              </option>

              {sports.map((sport) => (
                <option key={sport.value} value={sport.value}>
                  {sport.label}
                </option>
              ))}
            </select>

            {formError?.fields?.sport && (
              <p className='mt-2 text-sm text-red-600'>
                {formError.fields.sport}
              </p>
            )}
          </div>

          {!editMode && (
            <label className='flex items-start gap-3 lg:col-span-2'>
              <input
                name='isActive'
                type='checkbox'
                checked={form.isActive}
                disabled={saving}
                onChange={handleFormChange}
                className='mt-1 h-4 w-4'
              />

              <span>
                <span className='block text-sm font-medium'>
                  Active category
                </span>

                <span className='mt-1 block text-xs text-neutral-500'>
                  Active categories can appear in public category results.
                </span>
              </span>
            </label>
          )}

          {formError?.fields?.request && (
            <div
              role='alert'
              className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:col-span-2'>
              {formError.fields.request}
            </div>
          )}

          {formError && Object.keys(formError.fields || {}).length === 0 && (
            <div
              role='alert'
              className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:col-span-2'>
              {formError.message}
            </div>
          )}

          <div className='lg:col-span-2'>
            <button
              type='submit'
              disabled={saving || sportsLoading || Boolean(sportsError)}
              className='bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50'>
              {saving
                ? 'Saving...'
                : editMode
                  ? 'Save changes'
                  : 'Create category'}
            </button>
          </div>
        </form>
      </section>

      <section className='mt-8'>
        <div>
          <h2 className='text-lg font-semibold'>Category list</h2>

          <p className='mt-1 text-sm text-neutral-600'>
            Search and filter active or inactive categories.
          </p>
        </div>

        <form
          onSubmit={handleFilterSubmit}
          className='mt-5 grid gap-4 border border-neutral-200 p-4 md:grid-cols-3'>
          <div>
            <label htmlFor='q' className='mb-2 block text-sm font-medium'>
              Search
            </label>

            <input
              id='q'
              name='q'
              type='search'
              value={filterForm.q}
              onChange={handleFilterChange}
              placeholder='Category name'
              className='w-full border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-black'
            />
          </div>

          <div>
            <label
              htmlFor='filterSport'
              className='mb-2 block text-sm font-medium'>
              Sport
            </label>

            <select
              id='filterSport'
              name='sport'
              value={filterForm.sport}
              disabled={sportsLoading}
              onChange={handleFilterChange}
              className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none transition focus:border-black disabled:bg-neutral-100'>
              <option value=''>All sports</option>

              {sports.map((sport) => (
                <option key={sport.value} value={sport.value}>
                  {sport.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor='status' className='mb-2 block text-sm font-medium'>
              Status
            </label>

            <select
              id='status'
              name='status'
              value={filterForm.status}
              onChange={handleFilterChange}
              className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none transition focus:border-black'>
              <option value=''>All statuses</option>
              <option value='active'>Active</option>
              <option value='inactive'>Inactive</option>
            </select>
          </div>

          <div className='flex flex-wrap gap-3 md:col-span-3'>
            <button
              type='submit'
              disabled={loading}
              className='bg-black px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'>
              Apply filters
            </button>

            <button
              type='button'
              disabled={loading}
              onClick={handleResetFilters}
              className='border border-neutral-300 px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50'>
              Reset
            </button>
          </div>
        </form>

        {listError && (
          <div
            role='alert'
            className='mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {listError.message}
          </div>
        )}

        {loading && (
          <div className='mt-5 border border-neutral-200 p-6'>
            <p className='text-sm text-neutral-600'>Loading categories...</p>
          </div>
        )}

        {!loading && listError && categories.length === 0 && (
          <button
            type='button'
            onClick={loadCategories}
            className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
            Try again
          </button>
        )}

        {!loading && !listError && categories.length === 0 && (
          <div className='mt-5 border border-neutral-200 p-8 text-center'>
            <h3 className='font-semibold'>No categories found</h3>

            <p className='mt-2 text-sm text-neutral-600'>
              Create a category or change the current filters.
            </p>
          </div>
        )}

        {!loading && categories.length > 0 && (
          <div className='mt-5 overflow-x-auto border border-neutral-200'>
            <table className='min-w-full divide-y divide-neutral-200 text-left text-sm'>
              <thead className='bg-neutral-50'>
                <tr>
                  <th className='px-4 py-3 font-medium'>Category</th>
                  <th className='px-4 py-3 font-medium'>Sport</th>
                  <th className='px-4 py-3 font-medium'>Status</th>
                  <th className='px-4 py-3 font-medium'>Updated</th>
                  <th className='px-4 py-3 font-medium'>Actions</th>
                </tr>
              </thead>

              <tbody className='divide-y divide-neutral-200'>
                {categories.map((category) => {
                  const changingStatus = statusUpdatingId === category.id;

                  return (
                    <tr key={category.id}>
                      <td className='px-4 py-4 font-medium'>{category.name}</td>

                      <td className='px-4 py-4'>
                        {getSportLabel(category.sport)}
                      </td>

                      <td className='px-4 py-4'>
                        <span
                          className={
                            category.isActive
                              ? 'bg-green-50 px-2 py-1 text-xs font-medium text-green-700'
                              : 'bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600'
                          }>
                          {category.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className='px-4 py-4 text-neutral-600'>
                        {new Date(category.updatedAt).toLocaleDateString()}
                      </td>

                      <td className='px-4 py-4'>
                        <div className='flex flex-wrap gap-3'>
                          <button
                            type='button'
                            disabled={saving || Boolean(statusUpdatingId)}
                            onClick={() => handleStartEdit(category)}
                            className='font-medium underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50'>
                            Edit
                          </button>

                          <button
                            type='button'
                            disabled={saving || Boolean(statusUpdatingId)}
                            onClick={() => handleStatusChange(category)}
                            className={
                              category.isActive
                                ? 'font-medium text-red-700 underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50'
                                : 'font-medium text-green-700 underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50'
                            }>
                            {changingStatus
                              ? 'Updating...'
                              : category.isActive
                                ? 'Deactivate'
                                : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminCategoriesPage;
