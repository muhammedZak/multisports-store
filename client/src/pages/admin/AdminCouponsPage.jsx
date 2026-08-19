import { useCallback, useEffect, useState } from 'react';

import { Link, useLocation, useNavigate } from 'react-router';

import {
  fetchAdminCoupons,
  updateAdminCouponStatus,
} from '../../api/couponApi.js';

import { normalizeApiError } from '../../api/errors.js';

import { formatInrFromPaise } from '../../utils/money.js';

const EMPTY_FILTERS = {
  q: '',
  status: '',
  discountType: '',
  sort: 'createdAt',
  order: 'desc',
};

const DEFAULT_QUERY = {
  ...EMPTY_FILTERS,
  page: 1,
  limit: 20,
};

function formatDate(value) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getDiscountLabel(coupon) {
  if (coupon.discountType === 'percentage') {
    const cap =
      coupon.maximumDiscount !== null
        ? ` · max ${formatInrFromPaise(coupon.maximumDiscount)}`
        : '';

    return `${coupon.discountValue}%${cap}`;
  }

  return formatInrFromPaise(coupon.discountValue);
}

function AdminCouponsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [coupons, setCoupons] = useState([]);

  const [filterForm, setFilterForm] = useState(EMPTY_FILTERS);

  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_QUERY);

  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);

  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const [listError, setListError] = useState(null);

  const [message, setMessage] = useState(location.state?.message ?? '');

  useEffect(() => {
    if (!location.state?.message) {
      return;
    }

    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    });
  }, [location.pathname, location.search, location.state, navigate]);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    setListError(null);

    try {
      const result = await fetchAdminCoupons(appliedFilters);

      setCoupons(result.items);
      setMeta(result.meta);
    } catch (requestError) {
      setListError(
        normalizeApiError(
          requestError,
          'Unable to load coupons. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

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
      ...filterForm,
      q: filterForm.q.trim(),
      page: 1,
      limit: 20,
    });
  }

  function handleResetFilters() {
    setFilterForm(EMPTY_FILTERS);
    setAppliedFilters(DEFAULT_QUERY);
  }

  function changePage(page) {
    setAppliedFilters((current) => ({
      ...current,
      page,
    }));
  }

  async function handleStatusChange(coupon) {
    const nextIsActive = !coupon.isActive;

    if (!nextIsActive) {
      const confirmed = window.confirm(
        `Deactivate "${coupon.code}"? Customers will no longer be able to apply it.`,
      );

      if (!confirmed) {
        return;
      }
    }

    setStatusUpdatingId(coupon.id);
    setListError(null);
    setMessage('');

    try {
      await updateAdminCouponStatus(coupon.id, nextIsActive);

      setMessage(
        nextIsActive
          ? `Coupon ${coupon.code} activated successfully.`
          : `Coupon ${coupon.code} deactivated successfully.`,
      );

      await loadCoupons();
    } catch (requestError) {
      setListError(
        normalizeApiError(
          requestError,
          nextIsActive
            ? 'Unable to activate this Coupon.'
            : 'Unable to deactivate this Coupon.',
        ),
      );
    } finally {
      setStatusUpdatingId(null);
    }
  }

  return (
    <main className='p-5 sm:p-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
            Promotion management
          </p>

          <h1 className='mt-3 text-3xl font-semibold'>Coupons</h1>

          <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>
            Create and manage percentage or fixed discounts available to the
            store.
          </p>
        </div>

        <Link
          to='/admin/coupons/new'
          className='inline-flex bg-black px-5 py-3 text-sm font-medium text-white'>
          Add coupon
        </Link>
      </div>

      {message && (
        <div
          role='status'
          className='mt-6 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
          {message}
        </div>
      )}

      <form
        onSubmit={handleFilterSubmit}
        className='mt-8 grid gap-4 border border-neutral-200 p-4 md:grid-cols-2 xl:grid-cols-5'>
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
            placeholder='Coupon code'
            className='w-full border border-neutral-300 px-3 py-2.5 outline-none focus:border-black'
          />
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
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value=''>All statuses</option>
            <option value='active'>Active</option>
            <option value='inactive'>Inactive</option>
          </select>
        </div>

        <div>
          <label
            htmlFor='discountType'
            className='mb-2 block text-sm font-medium'>
            Discount type
          </label>

          <select
            id='discountType'
            name='discountType'
            value={filterForm.discountType}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value=''>All types</option>
            <option value='percentage'>Percentage</option>
            <option value='fixed'>Fixed amount</option>
          </select>
        </div>

        <div>
          <label htmlFor='sort' className='mb-2 block text-sm font-medium'>
            Sort
          </label>

          <select
            id='sort'
            name='sort'
            value={filterForm.sort}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value='createdAt'>Created</option>
            <option value='code'>Code</option>
            <option value='expiresAt'>Expiry</option>
          </select>
        </div>

        <div>
          <label htmlFor='order' className='mb-2 block text-sm font-medium'>
            Order
          </label>

          <select
            id='order'
            name='order'
            value={filterForm.order}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value='desc'>Descending</option>
            <option value='asc'>Ascending</option>
          </select>
        </div>

        <div className='flex flex-wrap gap-3 md:col-span-2 xl:col-span-5'>
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
        <div className='mt-5 border border-neutral-200 p-8 text-sm text-neutral-600'>
          Loading coupons...
        </div>
      )}

      {!loading && listError && coupons.length === 0 && (
        <button
          type='button'
          onClick={loadCoupons}
          className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
          Try again
        </button>
      )}

      {!loading && !listError && coupons.length === 0 && (
        <div className='mt-5 border border-neutral-200 p-8 text-center'>
          <h2 className='font-semibold'>No coupons found</h2>

          <p className='mt-2 text-sm text-neutral-600'>
            Try different filters or add your first Coupon.
          </p>

          <Link
            to='/admin/coupons/new'
            className='mt-5 inline-flex bg-black px-4 py-2.5 text-sm font-medium text-white'>
            Add coupon
          </Link>
        </div>
      )}

      {!loading && coupons.length > 0 && (
        <>
          <div className='mt-5 overflow-x-auto border border-neutral-200'>
            <table className='min-w-full text-left text-sm'>
              <thead className='bg-neutral-50'>
                <tr>
                  <th className='px-4 py-3 font-medium'>Coupon</th>

                  <th className='px-4 py-3 font-medium'>Discount</th>

                  <th className='px-4 py-3 font-medium'>Minimum</th>

                  <th className='px-4 py-3 font-medium'>Usage</th>

                  <th className='px-4 py-3 font-medium'>Expiry</th>

                  <th className='px-4 py-3 font-medium'>Status</th>

                  <th className='px-4 py-3 font-medium'>Actions</th>
                </tr>
              </thead>

              <tbody>
                {coupons.map((coupon) => (
                  <tr
                    key={coupon.id}
                    className='border-t border-neutral-200 align-top'>
                    <td className='px-4 py-4'>
                      <p className='font-semibold'>{coupon.code}</p>

                      <p className='mt-1 text-xs capitalize text-neutral-500'>
                        {coupon.discountType}
                      </p>
                    </td>

                    <td className='px-4 py-4'>{getDiscountLabel(coupon)}</td>

                    <td className='px-4 py-4'>
                      {coupon.minimumOrderAmount > 0
                        ? formatInrFromPaise(coupon.minimumOrderAmount)
                        : 'None'}
                    </td>

                    <td className='px-4 py-4'>
                      {coupon.usedCount}
                      {' / '}
                      {coupon.usageLimit ?? 'Unlimited'}
                    </td>

                    <td className='min-w-44 px-4 py-4'>
                      {formatDate(coupon.expiresAt)}
                    </td>

                    <td className='px-4 py-4'>
                      <span
                        className={[
                          'inline-flex px-2.5 py-1 text-xs font-medium',
                          coupon.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-neutral-200 text-neutral-700',
                        ].join(' ')}>
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className='px-4 py-4'>
                      <div className='flex min-w-36 flex-col items-start gap-2'>
                        <Link
                          to={`/admin/coupons/${coupon.id}/edit`}
                          className='font-medium underline underline-offset-4'>
                          Edit
                        </Link>

                        <button
                          type='button'
                          disabled={Boolean(statusUpdatingId)}
                          onClick={() => handleStatusChange(coupon)}
                          className='font-medium underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50'>
                          {statusUpdatingId === coupon.id
                            ? 'Updating...'
                            : coupon.isActive
                              ? 'Deactivate'
                              : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className='mt-5 flex flex-col gap-3 border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm text-neutral-600'>
              {meta.totalItems} coupon
              {meta.totalItems === 1 ? '' : 's'}
            </p>

            <div className='flex items-center gap-3'>
              <button
                type='button'
                disabled={meta.page <= 1 || loading}
                onClick={() => changePage(meta.page - 1)}
                className='border border-neutral-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40'>
                Previous
              </button>

              <span className='text-sm'>
                Page {meta.page} of {Math.max(meta.totalPages, 1)}
              </span>

              <button
                type='button'
                disabled={meta.page >= meta.totalPages || loading}
                onClick={() => changePage(meta.page + 1)}
                className='border border-neutral-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40'>
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

export default AdminCouponsPage;
