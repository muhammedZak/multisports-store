import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Select } from '../../../components/ui/Select.jsx';

import { Pagination } from '../../../components/shared/Pagination.jsx';

import {
  formatQuantityChange,
  getAdjustmentReasonLabel,
  inventoryDateFormatter,
} from '../inventory.utils.js';

function ChangeValue({ value }) {
  return (
    <span
      className={[
        'font-black ds-tabular-nums',

        value > 0
          ? 'text-[var(--color-success)]'
          : 'text-[var(--color-danger)]',
      ].join(' ')}>
      {formatQuantityChange(value)}
    </span>
  );
}

export function AdminInventoryHistory({ model }) {
  return (
    <section className='border-t border-[var(--color-border)] pt-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h2 className='mb-0 text-lg font-black'>Adjustment history</h2>

          <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
            Durable history of stock changes for this Inventory position.
          </p>
        </div>

        <p className='mb-0 text-sm text-[var(--color-muted)]'>
          {model.historyMeta.totalItems} adjustment
          {model.historyMeta.totalItems === 1 ? '' : 's'}
        </p>
      </div>

      <form
        onSubmit={model.applyHistoryFilters}
        className='mt-5 flex flex-col gap-4 border-y border-[var(--color-border)] py-5 sm:flex-row sm:flex-wrap sm:items-end'>
        <Select
          id='history-reason'
          name='reason'
          label='Reason'
          value={model.historyFilterForm.reason}
          onChange={model.handleHistoryFilterChange}>
          <option value=''>All reasons</option>

          <option value='initial_stock'>Initial stock</option>

          <option value='restock'>Restock</option>

          <option value='manual_correction'>Manual correction</option>

          <option value='order_purchase'>Order purchase</option>

          <option value='order_cancellation'>Order cancellation</option>

          <option value='refund_return'>Refund return</option>
        </Select>

        <Select
          id='history-order'
          name='order'
          label='Order'
          value={model.historyFilterForm.order}
          onChange={model.handleHistoryFilterChange}>
          <option value='desc'>Newest first</option>

          <option value='asc'>Oldest first</option>
        </Select>

        <Button type='submit' disabled={model.historyLoading}>
          Apply
        </Button>

        <Button
          type='button'
          variant='secondary'
          disabled={model.historyLoading}
          onClick={model.resetHistoryFilters}>
          Reset
        </Button>
      </form>

      {model.historyError ? (
        <Alert
          variant='danger'
          title='Unable to load adjustment history'
          className='mt-5'
          actions={
            <Button
              type='button'
              variant='secondary'
              size='sm'
              onClick={model.loadHistory}>
              Try again
            </Button>
          }>
          {model.historyError.message}
        </Alert>
      ) : null}

      {model.historyLoading ? (
        <p className='mt-5 mb-0 text-sm text-[var(--color-muted)]'>
          Loading adjustment history...
        </p>
      ) : null}

      {!model.historyLoading &&
      !model.historyError &&
      model.adjustments.length === 0 ? (
        <section className='mt-5 border-y border-[var(--color-border)] py-10 text-center'>
          <h3 className='mb-0 font-black'>No adjustment history found</h3>

          <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
            {model.historyQuery.reason
              ? 'No adjustments match the selected reason.'
              : 'Stock changes will appear here when adjustments are recorded.'}
          </p>
        </section>
      ) : null}

      {!model.historyLoading && model.adjustments.length > 0 ? (
        <>
          <div className='mt-5 grid gap-5 lg:hidden'>
            {model.adjustments.map((adjustment) => (
              <article
                key={adjustment.id}
                className='border-y border-[var(--color-border)] py-5'>
                <div className='flex items-start justify-between gap-4'>
                  <div>
                    <p className='mb-0 font-bold'>
                      {getAdjustmentReasonLabel(adjustment.reason)}
                    </p>

                    <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
                      {inventoryDateFormatter.format(
                        new Date(adjustment.createdAt),
                      )}
                    </p>
                  </div>

                  <ChangeValue value={adjustment.quantityChange} />
                </div>

                <dl className='mt-4 space-y-3 text-sm'>
                  <div>
                    <dt className='text-[var(--color-muted)]'>Quantity</dt>

                    <dd className='mt-1 mb-0 font-semibold'>
                      {adjustment.previousQuantity} → {adjustment.newQuantity}
                    </dd>
                  </div>

                  <div>
                    <dt className='text-[var(--color-muted)]'>Performed by</dt>

                    <dd className='mt-1 mb-0'>
                      {adjustment.performedBy
                        ? `${adjustment.performedBy.name} (${adjustment.performedBy.email})`
                        : 'System'}
                    </dd>
                  </div>

                  {adjustment.note ? (
                    <div>
                      <dt className='text-[var(--color-muted)]'>Note</dt>

                      <dd className='mt-1 mb-0'>{adjustment.note}</dd>
                    </div>
                  ) : null}
                </dl>
              </article>
            ))}
          </div>

          <div className='mt-5 hidden overflow-x-auto border-y border-[var(--color-border)] lg:block'>
            <table className='min-w-full text-left text-sm'>
              <thead className='bg-[var(--color-surface)]'>
                <tr>
                  <th className='px-4 py-3 font-bold'>Date</th>

                  <th className='px-4 py-3 font-bold'>Change</th>

                  <th className='px-4 py-3 font-bold'>Quantity</th>

                  <th className='px-4 py-3 font-bold'>Reason</th>

                  <th className='px-4 py-3 font-bold'>Performer</th>

                  <th className='px-4 py-3 font-bold'>Note</th>
                </tr>
              </thead>

              <tbody>
                {model.adjustments.map((adjustment) => (
                  <tr
                    key={adjustment.id}
                    className='border-t border-[var(--color-border)] align-top'>
                    <td className='whitespace-nowrap px-4 py-4 text-[var(--color-muted)]'>
                      {inventoryDateFormatter.format(
                        new Date(adjustment.createdAt),
                      )}
                    </td>

                    <td className='px-4 py-4 text-lg'>
                      <ChangeValue value={adjustment.quantityChange} />
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
                          <p className='mb-0 font-semibold'>
                            {adjustment.performedBy.name}
                          </p>

                          <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
                            {adjustment.performedBy.email}
                          </p>
                        </>
                      ) : (
                        'System'
                      )}

                      {adjustment.source ? (
                        <p className='mt-2 mb-0 text-xs text-[var(--color-muted)]'>
                          Source: {adjustment.source.type}
                        </p>
                      ) : null}
                    </td>

                    <td className='max-w-72 px-4 py-4 text-[var(--color-muted)]'>
                      {adjustment.note ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={model.historyMeta.page}
            totalPages={model.historyMeta.totalPages}
            totalItems={model.historyMeta.totalItems}
            itemLabel='adjustment'
            loading={model.historyLoading}
            onPageChange={model.changeHistoryPage}
          />
        </>
      ) : null}
    </section>
  );
}
