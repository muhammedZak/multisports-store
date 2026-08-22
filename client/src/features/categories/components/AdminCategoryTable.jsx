import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';

import { getCategorySportLabel } from '../category.utils.js';

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
});

export function AdminCategoryTable({ model }) {
  return (
    <div className='overflow-x-auto border-y border-[var(--color-border)]'>
      <table className='min-w-full text-left text-sm'>
        <thead className='bg-[var(--color-surface)]'>
          <tr>
            <th className='px-4 py-3 font-bold'>Category</th>

            <th className='px-4 py-3 font-bold'>Sport</th>

            <th className='px-4 py-3 font-bold'>Status</th>

            <th className='px-4 py-3 font-bold'>Updated</th>

            <th className='px-4 py-3 font-bold'>Actions</th>
          </tr>
        </thead>

        <tbody>
          {model.categories.map((category) => {
            const changing = model.statusUpdatingId === category.id;

            return (
              <tr
                key={category.id}
                className='border-t border-[var(--color-border)]'>
                <td className='px-4 py-4 font-bold'>{category.name}</td>

                <td className='px-4 py-4'>
                  {getCategorySportLabel(model.sports, category.sport)}
                </td>

                <td className='px-4 py-4'>
                  <Badge variant={category.isActive ? 'success' : 'neutral'}>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>

                <td className='whitespace-nowrap px-4 py-4 text-[var(--color-muted)]'>
                  {dateFormatter.format(new Date(category.updatedAt))}
                </td>

                <td className='px-4 py-4'>
                  <div className='flex flex-wrap gap-2'>
                    <Button
                      type='button'
                      variant='quiet'
                      size='sm'
                      disabled={model.saving || Boolean(model.statusUpdatingId)}
                      onClick={() => model.startEdit(category)}>
                      Edit
                    </Button>

                    <Button
                      type='button'
                      variant='quiet'
                      size='sm'
                      disabled={model.saving || Boolean(model.statusUpdatingId)}
                      onClick={() => model.changeStatus(category)}
                      className={
                        category.isActive
                          ? 'text-[var(--color-danger)]'
                          : 'text-[var(--color-success)]'
                      }>
                      {changing
                        ? 'Updating...'
                        : category.isActive
                          ? 'Deactivate'
                          : 'Activate'}
                    </Button>
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
