import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';

export function AdminCategoryForm({ model }) {
  return (
    <section className='mt-8 border-y border-[var(--color-border)] py-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h2 className='mb-0 text-lg font-black tracking-[-0.02em]'>
            {model.editMode ? 'Edit category' : 'Create category'}
          </h2>

          <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
            {model.editMode
              ? 'Update the Category name or Sport.'
              : 'Add a Category under one of the supported Sports.'}
          </p>
        </div>

        {model.editMode ? (
          <Button
            type='button'
            variant='quiet'
            size='sm'
            disabled={model.saving}
            onClick={model.resetForm}>
            Cancel edit
          </Button>
        ) : null}
      </div>

      <form
        onSubmit={model.submitCategory}
        className='mt-6 grid gap-5 lg:grid-cols-2'>
        <Input
          id='category-name'
          name='name'
          label='Category name'
          required
          disabled={model.saving}
          value={model.form.name}
          placeholder='Football Boots'
          error={model.formError?.fields?.name}
          onChange={model.handleFormChange}
        />

        <Select
          id='category-sport'
          name='sport'
          label='Sport'
          required
          disabled={model.saving || model.sportsLoading}
          value={model.form.sport}
          error={model.formError?.fields?.sport}
          onChange={model.handleFormChange}>
          <option value=''>
            {model.sportsLoading ? 'Loading sports...' : 'Select sport'}
          </option>

          {model.sports.map((sport) => (
            <option key={sport.value} value={sport.value}>
              {sport.label}
            </option>
          ))}
        </Select>

        {!model.editMode ? (
          <label className='flex cursor-pointer items-start gap-3 border-y border-[var(--color-border)] py-4 lg:col-span-2'>
            <input
              name='isActive'
              type='checkbox'
              checked={model.form.isActive}
              disabled={model.saving}
              onChange={model.handleFormChange}
              className='mt-1 size-4 accent-[var(--color-ink)]'
            />

            <span>
              <span className='block text-sm font-bold'>Active Category</span>

              <span className='mt-1 block text-xs text-[var(--color-muted)]'>
                Active Categories can appear in public Category results.
              </span>
            </span>
          </label>
        ) : null}

        {model.formError?.fields?.request ? (
          <Alert variant='danger' className='lg:col-span-2'>
            {model.formError.fields.request}
          </Alert>
        ) : null}

        {model.formError &&
        Object.keys(model.formError.fields || {}).length === 0 ? (
          <Alert variant='danger' className='lg:col-span-2'>
            {model.formError.message}
          </Alert>
        ) : null}

        <div className='lg:col-span-2'>
          <Button
            type='submit'
            disabled={
              model.saving || model.sportsLoading || Boolean(model.sportsError)
            }>
            {model.saving
              ? 'Saving...'
              : model.editMode
                ? 'Save changes'
                : 'Create category'}
          </Button>
        </div>
      </form>
    </section>
  );
}
