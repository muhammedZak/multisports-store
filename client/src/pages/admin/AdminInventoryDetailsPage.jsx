import { useCallback, useEffect, useState } from 'react';

import { Link, useParams } from 'react-router';

import { normalizeApiError } from '../../api/errors.js';

import {
  createAdminInventoryAdjustment,
  fetchAdminInventory,
  fetchAdminInventoryAdjustments,
} from '../../api/inventoryApi.js';

function formatDate(value) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getStockStateLabel(stockState) {
  if (stockState === 'in_stock') {
    return 'In stock';
  }

  if (stockState === 'low_stock') {
    return 'Low stock';
  }

  if (stockState === 'out_of_stock') {
    return 'Out of stock';
  }

  return stockState;
}

function getStockStateClass(stockState) {
  if (stockState === 'in_stock') {
    return 'bg-green-100 text-green-700';
  }

  if (stockState === 'low_stock') {
    return 'bg-amber-100 text-amber-700';
  }

  if (stockState === 'out_of_stock') {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-neutral-100 text-neutral-700';
}

const EMPTY_ADJUSTMENT_FORM = {
  quantityChange: '',
  reason: 'restock',
  note: '',
};

const EMPTY_HISTORY_FILTERS = {
  reason: '',
  order: 'desc',
};

const DEFAULT_HISTORY_QUERY = {
  ...EMPTY_HISTORY_FILTERS,
  sort: 'createdAt',
  page: 1,
  limit: 20,
};

const ADJUSTMENT_REASON_LABELS = {
  initial_stock: 'Initial stock',
  restock: 'Restock',
  manual_correction: 'Manual correction',
  order_purchase: 'Order purchase',
  order_cancellation: 'Order cancellation',
  refund_return: 'Refund return',
};

function getAdjustmentReasonLabel(reason) {
  return ADJUSTMENT_REASON_LABELS[reason] ?? reason;
}

function formatQuantityChange(value) {
  return value > 0 ? `+${value}` : String(value);
}

function getQuantityChangeClass(value) {
  if (value > 0) {
    return 'text-green-700';
  }

  return 'text-red-700';
}

function AdminInventoryDetailsPage() {
  const { inventoryId } = useParams();

  const [inventory, setInventory] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [adjustmentForm, setAdjustmentForm] = useState(EMPTY_ADJUSTMENT_FORM);

  const [adjustmentSubmitting, setAdjustmentSubmitting] = useState(false);

  const [adjustmentError, setAdjustmentError] = useState(null);

  const [successMessage, setSuccessMessage] = useState('');

  const [adjustments, setAdjustments] = useState([]);

  const [historyFilterForm, setHistoryFilterForm] = useState(
    EMPTY_HISTORY_FILTERS,
  );

  const [historyQuery, setHistoryQuery] = useState(DEFAULT_HISTORY_QUERY);

  const [historyMeta, setHistoryMeta] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 0,
  });

  const [historyLoading, setHistoryLoading] = useState(true);

  const [historyError, setHistoryError] = useState(null);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const item = await fetchAdminInventory(inventoryId);

      setInventory(item);
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          'Unable to load this inventory position.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [inventoryId]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const result = await fetchAdminInventoryAdjustments(
        inventoryId,
        historyQuery,
      );

      setAdjustments(result.items);
      setHistoryMeta(result.meta);
    } catch (requestError) {
      setHistoryError(
        normalizeApiError(requestError, 'Unable to load adjustment history.'),
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [inventoryId, historyQuery]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  async function refreshAuthoritativeState() {
    setError(null);
    setHistoryError(null);

    const [inventoryResult, historyResult] = await Promise.allSettled([
      fetchAdminInventory(inventoryId),

      fetchAdminInventoryAdjustments(inventoryId, historyQuery),
    ]);

    if (inventoryResult.status === 'fulfilled') {
      setInventory(inventoryResult.value);
    } else {
      setError(
        normalizeApiError(
          inventoryResult.reason,
          'Stock changed, but the latest inventory state could not be refreshed.',
        ),
      );
    }

    if (historyResult.status === 'fulfilled') {
      setAdjustments(historyResult.value.items);
      setHistoryMeta(historyResult.value.meta);
    } else {
      setHistoryError(
        normalizeApiError(
          historyResult.reason,
          'Unable to refresh adjustment history.',
        ),
      );
    }
  }

  function handleAdjustmentChange(event) {
    const { name, value } = event.target;

    setAdjustmentForm((current) => ({
      ...current,
      [name]: value,
    }));

    setAdjustmentError(null);
    setSuccessMessage('');
  }

  function validateAdjustmentForm() {
    const fields = {};

    const quantityText = adjustmentForm.quantityChange.trim();

    const quantityChange = Number(quantityText);

    if (
      !quantityText ||
      !Number.isSafeInteger(quantityChange) ||
      quantityChange === 0
    ) {
      fields.quantityChange = 'Quantity change must be a non-zero integer.';
    }

    if (
      adjustmentForm.reason === 'restock' &&
      Number.isSafeInteger(quantityChange) &&
      quantityChange <= 0
    ) {
      fields.quantityChange = 'Restock quantity change must be greater than 0.';
    }

    const note = adjustmentForm.note.trim().replace(/\s+/g, ' ');

    if (adjustmentForm.reason === 'manual_correction' && !note) {
      fields.note = 'A note is required for a manual inventory correction.';
    }

    if (Object.keys(fields).length > 0) {
      return {
        valid: false,
        fields,
      };
    }

    return {
      valid: true,
      payload: {
        quantityChange,
        reason: adjustmentForm.reason,

        ...(note
          ? {
              note,
            }
          : {}),
      },
    };
  }

  async function handleAdjustmentSubmit(event) {
    event.preventDefault();

    setAdjustmentError(null);
    setSuccessMessage('');

    const validation = validateAdjustmentForm();

    if (!validation.valid) {
      setAdjustmentError({
        code: 'CLIENT_VALIDATION',
        message: 'Please correct the invalid fields.',
        fields: validation.fields,
      });

      return;
    }

    setAdjustmentSubmitting(true);

    try {
      await createAdminInventoryAdjustment(inventoryId, validation.payload);

      setSuccessMessage('Inventory adjusted successfully.');

      setAdjustmentForm(EMPTY_ADJUSTMENT_FORM);

      await refreshAuthoritativeState();
    } catch (requestError) {
      const normalizedError = normalizeApiError(
        requestError,
        'Unable to adjust inventory.',
      );

      setAdjustmentError(normalizedError);

      if (normalizedError.code === 'INVENTORY_QUANTITY_CONFLICT') {
        await refreshAuthoritativeState();
      }
    } finally {
      setAdjustmentSubmitting(false);
    }
  }

  function handleHistoryFilterChange(event) {
    const { name, value } = event.target;

    setHistoryFilterForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleHistoryFilterSubmit(event) {
    event.preventDefault();

    setHistoryQuery({
      ...historyFilterForm,
      sort: 'createdAt',
      page: 1,
      limit: 20,
    });
  }

  function handleHistoryReset() {
    setHistoryFilterForm(EMPTY_HISTORY_FILTERS);
    setHistoryQuery(DEFAULT_HISTORY_QUERY);
  }

  function changeHistoryPage(page) {
    setHistoryQuery((current) => ({
      ...current,
      page,
    }));
  }

  if (loading) {
    return (
      <main className='p-5 sm:p-6'>
        <p className='text-sm text-neutral-600'>Loading inventory...</p>
      </main>
    );
  }

  if (error && !inventory) {
    return (
      <main className='p-5 sm:p-6'>
        <div
          role='alert'
          className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error.message}
        </div>

        <div className='mt-5 flex flex-wrap gap-4'>
          {error.code !== 'INVENTORY_NOT_FOUND' && (
            <button
              type='button'
              onClick={loadInventory}
              className='bg-black px-4 py-2 text-sm font-medium text-white'>
              Try again
            </button>
          )}

          <Link
            to='/admin/inventory'
            className='px-4 py-2 text-sm font-medium underline underline-offset-4'>
            Back to inventory
          </Link>
        </div>
      </main>
    );
  }

  const variantOptions = Object.entries(inventory.variant?.options ?? {});

  return (
    <main className='p-5 sm:p-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
            Inventory details
          </p>

          <h1 className='mt-3 text-3xl font-semibold'>
            {inventory.product.name}
          </h1>

          <p className='mt-2 text-sm text-neutral-600'>
            {inventory.product.brand} ·{' '}
            <span className='capitalize'>{inventory.product.sport}</span>
          </p>
        </div>

        <Link
          to={`/admin/products/${inventory.product.id}`}
          className='inline-flex border border-neutral-300 px-4 py-2.5 text-sm font-medium'>
          View product
        </Link>
      </div>

      {error && inventory && (
        <div
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error.message}
        </div>
      )}

      <section className='mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <div className='border border-neutral-200 p-5'>
          <p className='text-sm text-neutral-500'>Current stock</p>

          <p className='mt-2 text-3xl font-semibold'>{inventory.quantity}</p>
        </div>

        <div className='border border-neutral-200 p-5'>
          <p className='text-sm text-neutral-500'>Stock state</p>

          <span
            className={[
              'mt-3 inline-flex px-3 py-1.5 text-sm font-medium',
              getStockStateClass(inventory.stockState),
            ].join(' ')}>
            {getStockStateLabel(inventory.stockState)}
          </span>
        </div>

        <div className='border border-neutral-200 p-5'>
          <p className='text-sm text-neutral-500'>Product status</p>

          <p className='mt-2 font-semibold'>
            {inventory.product.isActive ? 'Active' : 'Inactive'}
          </p>
        </div>

        <div className='border border-neutral-200 p-5'>
          <p className='text-sm text-neutral-500'>Inventory type</p>

          <p className='mt-2 font-semibold'>
            {inventory.variant ? 'Variant' : 'Simple product'}
          </p>
        </div>
      </section>

      <section className='mt-6 border border-neutral-200 p-5'>
        <div>
          <h2 className='text-lg font-semibold'>Adjust inventory</h2>

          <p className='mt-1 text-sm text-neutral-600'>
            Current authoritative quantity:{' '}
            <span className='font-semibold text-neutral-900'>
              {inventory.quantity}
            </span>
          </p>
        </div>

        {successMessage && (
          <div
            role='status'
            className='mt-5 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
            {successMessage}
          </div>
        )}

        {adjustmentError && (
          <div
            role='alert'
            className='mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {adjustmentError.message}
          </div>
        )}

        <form
          onSubmit={handleAdjustmentSubmit}
          className='mt-5 grid gap-5 lg:grid-cols-2'>
          <div>
            <label
              htmlFor='quantityChange'
              className='block text-sm font-medium'>
              Quantity change
            </label>

            <input
              id='quantityChange'
              name='quantityChange'
              type='number'
              step='1'
              value={adjustmentForm.quantityChange}
              disabled={adjustmentSubmitting}
              onChange={handleAdjustmentChange}
              placeholder='Example: 10 or -2'
              className='mt-2 w-full border border-neutral-300 px-3 py-2.5 outline-none focus:border-black disabled:bg-neutral-100'
            />

            <p className='mt-2 text-xs text-neutral-500'>
              Enter the amount to add or remove, not the final stock quantity.
            </p>

            {adjustmentError?.fields?.quantityChange && (
              <p className='mt-2 text-sm text-red-600'>
                {adjustmentError.fields.quantityChange}
              </p>
            )}
          </div>

          <div>
            <label htmlFor='reason' className='block text-sm font-medium'>
              Reason
            </label>

            <select
              id='reason'
              name='reason'
              value={adjustmentForm.reason}
              disabled={adjustmentSubmitting}
              onChange={handleAdjustmentChange}
              className='mt-2 w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black disabled:bg-neutral-100'>
              <option value='restock'>Restock</option>

              <option value='manual_correction'>Manual correction</option>
            </select>

            {adjustmentError?.fields?.reason && (
              <p className='mt-2 text-sm text-red-600'>
                {adjustmentError.fields.reason}
              </p>
            )}
          </div>

          <div className='lg:col-span-2'>
            <label htmlFor='note' className='block text-sm font-medium'>
              Note
              {adjustmentForm.reason === 'manual_correction' && (
                <span className='text-red-600'> *</span>
              )}
            </label>

            <textarea
              id='note'
              name='note'
              rows='3'
              value={adjustmentForm.note}
              disabled={adjustmentSubmitting}
              onChange={handleAdjustmentChange}
              placeholder={
                adjustmentForm.reason === 'manual_correction'
                  ? 'Explain why this correction is required'
                  : 'Optional note'
              }
              className='mt-2 w-full resize-y border border-neutral-300 px-3 py-2.5 outline-none focus:border-black disabled:bg-neutral-100'
            />

            {adjustmentError?.fields?.note && (
              <p className='mt-2 text-sm text-red-600'>
                {adjustmentError.fields.note}
              </p>
            )}
          </div>

          <div className='lg:col-span-2'>
            <button
              type='submit'
              disabled={adjustmentSubmitting}
              className='bg-black px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'>
              {adjustmentSubmitting ? 'Adjusting stock...' : 'Adjust stock'}
            </button>
          </div>
        </form>
      </section>

      <section className='mt-6 border border-neutral-200 p-5'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div>
            <h2 className='text-lg font-semibold'>Adjustment history</h2>

            <p className='mt-1 text-sm text-neutral-600'>
              Durable history of stock changes for this inventory position.
            </p>
          </div>

          <p className='text-sm text-neutral-500'>
            {historyMeta.totalItems} adjustment
            {historyMeta.totalItems === 1 ? '' : 's'}
          </p>
        </div>

        <form
          onSubmit={handleHistoryFilterSubmit}
          className='mt-5 flex flex-col gap-4 border border-neutral-200 p-4 sm:flex-row sm:flex-wrap sm:items-end'>
          <div>
            <label
              htmlFor='historyReason'
              className='block text-sm font-medium'>
              Reason
            </label>

            <select
              id='historyReason'
              name='reason'
              value={historyFilterForm.reason}
              onChange={handleHistoryFilterChange}
              className='mt-2 border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black'>
              <option value=''>All reasons</option>

              <option value='initial_stock'>Initial stock</option>

              <option value='restock'>Restock</option>

              <option value='manual_correction'>Manual correction</option>

              <option value='order_purchase'>Order purchase</option>

              <option value='order_cancellation'>Order cancellation</option>

              <option value='refund_return'>Refund return</option>
            </select>
          </div>

          <div>
            <label htmlFor='historyOrder' className='block text-sm font-medium'>
              Order
            </label>

            <select
              id='historyOrder'
              name='order'
              value={historyFilterForm.order}
              onChange={handleHistoryFilterChange}
              className='mt-2 border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black'>
              <option value='desc'>Newest first</option>
              <option value='asc'>Oldest first</option>
            </select>
          </div>

          <button
            type='submit'
            disabled={historyLoading}
            className='bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50'>
            Apply
          </button>

          <button
            type='button'
            disabled={historyLoading}
            onClick={handleHistoryReset}
            className='border border-neutral-300 px-4 py-2.5 text-sm font-medium disabled:opacity-50'>
            Reset
          </button>
        </form>

        {historyError && (
          <div
            role='alert'
            className='mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {historyError.message}

            <button
              type='button'
              onClick={loadHistory}
              className='ml-3 font-medium underline underline-offset-4'>
              Try again
            </button>
          </div>
        )}

        {historyLoading && (
          <p className='mt-5 text-sm text-neutral-600'>
            Loading adjustment history...
          </p>
        )}

        {!historyLoading && !historyError && adjustments.length === 0 && (
          <div className='mt-5 border border-neutral-200 p-6 text-center'>
            <p className='font-medium'>No adjustment history found</p>

            <p className='mt-2 text-sm text-neutral-600'>
              {historyQuery.reason
                ? 'No adjustments match the selected reason.'
                : 'Stock changes will appear here when adjustments are recorded.'}
            </p>
          </div>
        )}

        {!historyLoading && adjustments.length > 0 && (
          <>
            {/* Mobile history */}
            <div className='mt-5 grid gap-4 lg:hidden'>
              {adjustments.map((adjustment) => (
                <article
                  key={adjustment.id}
                  className='border border-neutral-200 p-4'>
                  <div className='flex items-start justify-between gap-4'>
                    <div>
                      <p className='font-medium'>
                        {getAdjustmentReasonLabel(adjustment.reason)}
                      </p>

                      <p className='mt-1 text-xs text-neutral-500'>
                        {formatDate(adjustment.createdAt)}
                      </p>
                    </div>

                    <span
                      className={[
                        'text-lg font-semibold',
                        getQuantityChangeClass(adjustment.quantityChange),
                      ].join(' ')}>
                      {formatQuantityChange(adjustment.quantityChange)}
                    </span>
                  </div>

                  <dl className='mt-4 space-y-3 text-sm'>
                    <div>
                      <dt className='text-neutral-500'>Quantity</dt>

                      <dd className='mt-1 font-medium'>
                        {adjustment.previousQuantity} → {adjustment.newQuantity}
                      </dd>
                    </div>

                    <div>
                      <dt className='text-neutral-500'>Performed by</dt>

                      <dd className='mt-1'>
                        {adjustment.performedBy
                          ? `${adjustment.performedBy.name} (${adjustment.performedBy.email})`
                          : 'System'}
                      </dd>
                    </div>

                    {adjustment.note && (
                      <div>
                        <dt className='text-neutral-500'>Note</dt>

                        <dd className='mt-1'>{adjustment.note}</dd>
                      </div>
                    )}

                    {adjustment.source && (
                      <div>
                        <dt className='text-neutral-500'>Source</dt>

                        <dd className='mt-1 break-all'>
                          {adjustment.source.type} · {adjustment.source.id}
                        </dd>
                      </div>
                    )}
                  </dl>
                </article>
              ))}
            </div>

            {/* Desktop history */}
            <div className='mt-5 hidden overflow-x-auto border border-neutral-200 lg:block'>
              <table className='min-w-full text-left text-sm'>
                <thead className='bg-neutral-50'>
                  <tr>
                    <th className='px-4 py-3 font-medium'>Date</th>

                    <th className='px-4 py-3 font-medium'>Change</th>

                    <th className='px-4 py-3 font-medium'>Quantity</th>

                    <th className='px-4 py-3 font-medium'>Reason</th>

                    <th className='px-4 py-3 font-medium'>Performer</th>

                    <th className='px-4 py-3 font-medium'>Note</th>
                  </tr>
                </thead>

                <tbody>
                  {adjustments.map((adjustment) => (
                    <tr
                      key={adjustment.id}
                      className='border-t border-neutral-200 align-top'>
                      <td className='whitespace-nowrap px-4 py-4 text-neutral-600'>
                        {formatDate(adjustment.createdAt)}
                      </td>

                      <td
                        className={[
                          'px-4 py-4 text-lg font-semibold',
                          getQuantityChangeClass(adjustment.quantityChange),
                        ].join(' ')}>
                        {formatQuantityChange(adjustment.quantityChange)}
                      </td>

                      <td className='whitespace-nowrap px-4 py-4'>
                        {adjustment.previousQuantity} → {adjustment.newQuantity}
                      </td>

                      <td className='px-4 py-4'>
                        {getAdjustmentReasonLabel(adjustment.reason)}
                      </td>

                      <td className='px-4 py-4'>
                        {adjustment.performedBy ? (
                          <>
                            <p className='font-medium'>
                              {adjustment.performedBy.name}
                            </p>

                            <p className='mt-1 text-xs text-neutral-500'>
                              {adjustment.performedBy.email}
                            </p>
                          </>
                        ) : (
                          'System'
                        )}

                        {adjustment.source && (
                          <p className='mt-2 text-xs text-neutral-500'>
                            Source: {adjustment.source.type}
                          </p>
                        )}
                      </td>

                      <td className='max-w-72 px-4 py-4 text-neutral-600'>
                        {adjustment.note ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className='mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <p className='text-sm text-neutral-600'>
                Page {historyMeta.page} of {Math.max(historyMeta.totalPages, 1)}
              </p>

              <div className='flex gap-3'>
                <button
                  type='button'
                  disabled={historyMeta.page <= 1 || historyLoading}
                  onClick={() => changeHistoryPage(historyMeta.page - 1)}
                  className='border border-neutral-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40'>
                  Previous
                </button>

                <button
                  type='button'
                  disabled={
                    historyMeta.page >= historyMeta.totalPages || historyLoading
                  }
                  onClick={() => changeHistoryPage(historyMeta.page + 1)}
                  className='border border-neutral-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40'>
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <section className='mt-6 border border-neutral-200 p-5'>
        <h2 className='text-lg font-semibold'>Product context</h2>

        <dl className='mt-4 grid gap-5 text-sm sm:grid-cols-2'>
          <div>
            <dt className='text-neutral-500'>Product</dt>

            <dd className='mt-1 font-medium'>{inventory.product.name}</dd>
          </div>

          <div>
            <dt className='text-neutral-500'>Brand</dt>

            <dd className='mt-1 font-medium'>{inventory.product.brand}</dd>
          </div>

          <div>
            <dt className='text-neutral-500'>Sport</dt>

            <dd className='mt-1 font-medium capitalize'>
              {inventory.product.sport}
            </dd>
          </div>

          <div>
            <dt className='text-neutral-500'>Category</dt>

            <dd className='mt-1 font-medium'>
              {inventory.product.category?.name ?? '—'}
            </dd>
          </div>
        </dl>
      </section>

      <section className='mt-6 border border-neutral-200 p-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-lg font-semibold'>Variant</h2>

            <p className='mt-1 text-sm text-neutral-600'>
              {inventory.variant
                ? 'This stock position belongs to one embedded product variant.'
                : 'This is the Product-level stock position for a simple Product.'}
            </p>
          </div>

          {inventory.variant && (
            <span
              className={[
                'px-3 py-1 text-sm font-medium',
                inventory.variant.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-neutral-200 text-neutral-700',
              ].join(' ')}>
              {inventory.variant.isActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </div>

        {!inventory.variant ? (
          <p className='mt-5 text-sm font-medium'>Simple product</p>
        ) : variantOptions.length === 0 ? (
          <p className='mt-5 text-sm text-neutral-500'>
            No variant options recorded.
          </p>
        ) : (
          <dl className='mt-5 divide-y divide-neutral-200 border border-neutral-200'>
            {variantOptions.map(([name, value]) => (
              <div key={name} className='grid gap-1 p-3 text-sm sm:grid-cols-2'>
                <dt className='font-medium'>{name}</dt>

                <dd className='text-neutral-600'>{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className='mt-6 border border-neutral-200 p-5'>
        <h2 className='text-lg font-semibold'>Inventory information</h2>

        <dl className='mt-4 grid gap-5 text-sm sm:grid-cols-2'>
          <div>
            <dt className='text-neutral-500'>Inventory ID</dt>

            <dd className='mt-1 break-all font-medium'>{inventory.id}</dd>
          </div>

          <div>
            <dt className='text-neutral-500'>Variant ID</dt>

            <dd className='mt-1 break-all font-medium'>
              {inventory.variant?.id ?? '—'}
            </dd>
          </div>

          <div>
            <dt className='text-neutral-500'>Created</dt>

            <dd className='mt-1'>{formatDate(inventory.createdAt)}</dd>
          </div>

          <div>
            <dt className='text-neutral-500'>Last updated</dt>

            <dd className='mt-1'>{formatDate(inventory.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <Link
        to='/admin/inventory'
        className='mt-6 inline-flex text-sm font-medium underline underline-offset-4'>
        Back to inventory
      </Link>
    </main>
  );
}

export default AdminInventoryDetailsPage;
