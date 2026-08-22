import { Link } from 'react-router';

import { Badge } from '../../../components/ui/Badge.jsx';

import { formatInrFromPaise } from '../../../utils/money.js';

import {
  getAdminProductDiscountLabel,
  getAdminProductSportLabel,
} from '../adminProduct.utils.js';

export function AdminProductTable({ products, sports }) {
  return (
    <div className='overflow-x-auto border-y border-[var(--color-border)]'>
      <table className='min-w-full text-left text-sm'>
        <thead className='bg-[var(--color-surface)]'>
          <tr>
            <th className='px-4 py-3 font-bold'>Product</th>

            <th className='px-4 py-3 font-bold'>Category</th>

            <th className='px-4 py-3 font-bold'>Price</th>

            <th className='px-4 py-3 font-bold'>Status</th>

            <th className='px-4 py-3 font-bold'>Actions</th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => {
            const discount = getAdminProductDiscountLabel(product, true);

            return (
              <tr
                key={product.id}
                className='border-t border-[var(--color-border)] align-top'>
                <td className='px-4 py-4'>
                  <div className='flex min-w-64 items-center gap-3'>
                    {product.primaryImage?.url ? (
                      <img
                        src={product.primaryImage.url}
                        alt={product.primaryImage.altText || product.name}
                        className='size-16 object-cover'
                      />
                    ) : (
                      <div className='grid size-16 place-items-center bg-[var(--color-surface)] text-xs text-[var(--color-muted)]'>
                        No image
                      </div>
                    )}

                    <div>
                      <p className='mb-0 font-bold'>{product.name}</p>

                      <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
                        {product.brand}
                        {' · '}
                        {getAdminProductSportLabel(sports, product.sport)}
                      </p>
                    </div>
                  </div>
                </td>

                <td className='px-4 py-4'>{product.category?.name ?? '—'}</td>

                <td className='px-4 py-4'>
                  <p className='mb-0 font-bold ds-tabular-nums'>
                    {formatInrFromPaise(product.basePrice)}
                  </p>

                  {discount ? (
                    <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
                      {discount}
                    </p>
                  ) : null}
                </td>

                <td className='px-4 py-4'>
                  <Badge variant={product.isActive ? 'success' : 'neutral'}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>

                <td className='px-4 py-4'>
                  <div className='flex gap-3'>
                    <Link
                      to={`/admin/products/${product.id}`}
                      className='font-semibold underline underline-offset-4'>
                      View
                    </Link>

                    <Link
                      to={`/admin/products/${product.id}/edit`}
                      className='font-semibold underline underline-offset-4'>
                      Edit
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
