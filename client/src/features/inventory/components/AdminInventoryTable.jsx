import { Link } from 'react-router';

import { Badge } from '../../../components/ui/Badge.jsx';

import {
  formatInventoryVariant,
  inventoryDateFormatter,
} from '../inventory.utils.js';

import { InventoryStockBadge } from './InventoryStockBadge.jsx';

function InventoryRowContent({ inventory, sportLabel }) {
  return (
    <>
      <div>
        <p className='mb-0 font-bold'>{inventory.product.name}</p>

        <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
          {inventory.product.brand}
          {' · '}
          {sportLabel}
        </p>

        <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
          {inventory.product.category?.name ?? '—'}
        </p>

        {!inventory.product.isActive ? (
          <Badge variant='neutral' className='mt-2'>
            Product inactive
          </Badge>
        ) : null}
      </div>
    </>
  );
}

export function AdminInventoryTable({
  inventories,

  getSportLabel,
}) {
  return (
    <>
      <div className='grid gap-5 md:hidden'>
        {inventories.map((inventory) => (
          <article
            key={inventory.id}
            className='border-y border-[var(--color-border)] py-5'>
            <div className='flex items-start justify-between gap-4'>
              <InventoryRowContent
                inventory={inventory}
                sportLabel={getSportLabel(inventory.product.sport)}
              />

              <InventoryStockBadge stockState={inventory.stockState} />
            </div>

            <dl className='mt-5 space-y-4 text-sm'>
              <div>
                <dt className='text-[var(--color-muted)]'>Inventory</dt>

                <dd className='mt-1 mb-0 font-semibold'>
                  {formatInventoryVariant(inventory.variant)}
                </dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Exact quantity</dt>

                <dd className='mt-1 mb-0 text-xl font-black ds-tabular-nums'>
                  {inventory.quantity}
                </dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Updated</dt>

                <dd className='mt-1 mb-0'>
                  {inventoryDateFormatter.format(new Date(inventory.updatedAt))}
                </dd>
              </div>
            </dl>

            <Link
              to={`/admin/inventory/${inventory.id}`}
              className='mt-5 inline-flex text-sm font-semibold underline underline-offset-4'>
              Adjust / History
            </Link>
          </article>
        ))}
      </div>

      <div className='hidden overflow-x-auto border-y border-[var(--color-border)] md:block'>
        <table className='min-w-full text-left text-sm'>
          <thead className='bg-[var(--color-surface)]'>
            <tr>
              <th className='px-4 py-3 font-bold'>Product</th>

              <th className='px-4 py-3 font-bold'>Inventory</th>

              <th className='px-4 py-3 font-bold'>Quantity</th>

              <th className='px-4 py-3 font-bold'>Stock state</th>

              <th className='px-4 py-3 font-bold'>Updated</th>

              <th className='px-4 py-3 font-bold'>Actions</th>
            </tr>
          </thead>

          <tbody>
            {inventories.map((inventory) => (
              <tr
                key={inventory.id}
                className='border-t border-[var(--color-border)] align-top'>
                <td className='px-4 py-4'>
                  <InventoryRowContent
                    inventory={inventory}
                    sportLabel={getSportLabel(inventory.product.sport)}
                  />
                </td>

                <td className='px-4 py-4'>
                  <p className='mb-0 max-w-72'>
                    {formatInventoryVariant(inventory.variant)}
                  </p>

                  {inventory.variant && !inventory.variant.isActive ? (
                    <Badge variant='neutral' className='mt-2'>
                      Variant inactive
                    </Badge>
                  ) : null}
                </td>

                <td className='px-4 py-4 text-lg font-black ds-tabular-nums'>
                  {inventory.quantity}
                </td>

                <td className='px-4 py-4'>
                  <InventoryStockBadge stockState={inventory.stockState} />
                </td>

                <td className='whitespace-nowrap px-4 py-4 text-[var(--color-muted)]'>
                  {inventoryDateFormatter.format(new Date(inventory.updatedAt))}
                </td>

                <td className='px-4 py-4'>
                  <Link
                    to={`/admin/inventory/${inventory.id}`}
                    className='font-semibold underline underline-offset-4'>
                    Adjust / History
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
