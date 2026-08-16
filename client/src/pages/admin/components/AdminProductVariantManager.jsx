import { useEffect, useState } from 'react';

import {
  addAdminProductVariant,
  updateAdminProductVariant,
  updateAdminProductVariantStatus,
} from '../../../api/productApi.js';

import { normalizeApiError } from '../../../api/errors.js';

let nextOptionRowId = 0;

function createOptionRow(name = '', value = '') {
  nextOptionRowId += 1;

  return {
    id: `variant-option-${nextOptionRowId}`,
    name,
    value,
  };
}

function optionsToRows(options = {}) {
  const entries = Object.entries(options);

  if (entries.length === 0) {
    return [createOptionRow()];
  }

  return entries.map(([name, value]) => createOptionRow(name, String(value)));
}

function normalizeSingleLineText(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function createLocalValidationError(message) {
  return {
    code: 'VALIDATION_ERROR',
    message: 'Please correct the invalid fields.',
    fields: {
      options: message,
    },
  };
}

function validateOptionRows(rows) {
  if (rows.length === 0) {
    return {
      options: null,
      error: 'Add at least one Variant option.',
    };
  }

  const options = {};
  const normalizedOptionNames = new Set();

  for (const row of rows) {
    const name = normalizeSingleLineText(row.name);
    const value = normalizeSingleLineText(row.value);

    if (!name) {
      return {
        options: null,
        error: 'Every Variant option needs a name.',
      };
    }

    if (name.startsWith('$') || name.includes('.')) {
      return {
        options: null,
        error: 'Option names cannot start with $ or contain dots.',
      };
    }

    if (!value) {
      return {
        options: null,
        error: `Enter a value for "${name}".`,
      };
    }

    const normalizedName = name.toLowerCase();

    if (normalizedOptionNames.has(normalizedName)) {
      return {
        options: null,
        error: `Option name "${name}" is duplicated.`,
      };
    }

    normalizedOptionNames.add(normalizedName);

    options[name] = value;
  }

  return {
    options,
    error: null,
  };
}

function OptionRowsEditor({
  rows,
  prefix,
  disabled,
  onChange,
  onAdd,
  onRemove,
}) {
  return (
    <div>
      <div className='space-y-3'>
        {rows.map((row, index) => (
          <div
            key={row.id}
            className='grid gap-3 border border-neutral-200 p-3 sm:grid-cols-[1fr_1fr_auto]'>
            <div>
              <label
                htmlFor={`${prefix}-name-${row.id}`}
                className='mb-1.5 block text-xs font-medium text-neutral-600'>
                Option name
              </label>

              <input
                id={`${prefix}-name-${row.id}`}
                type='text'
                placeholder={index === 0 ? 'e.g. size' : 'e.g. color'}
                disabled={disabled}
                value={row.name}
                onChange={(event) =>
                  onChange(row.id, 'name', event.target.value)
                }
                className='w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-black disabled:bg-neutral-100'
              />
            </div>

            <div>
              <label
                htmlFor={`${prefix}-value-${row.id}`}
                className='mb-1.5 block text-xs font-medium text-neutral-600'>
                Option value
              </label>

              <input
                id={`${prefix}-value-${row.id}`}
                type='text'
                placeholder={index === 0 ? 'e.g. 9' : 'e.g. Black'}
                disabled={disabled}
                value={row.value}
                onChange={(event) =>
                  onChange(row.id, 'value', event.target.value)
                }
                className='w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-black disabled:bg-neutral-100'
              />
            </div>

            <div className='flex items-end'>
              <button
                type='button'
                disabled={disabled || rows.length === 1}
                onClick={() => onRemove(row.id)}
                className='border border-neutral-300 px-3 py-2.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40'>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type='button'
        disabled={disabled}
        onClick={onAdd}
        className='mt-3 border border-neutral-300 px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50'>
        Add option
      </button>
    </div>
  );
}

function AdminProductVariantManager({
  product,
  onProductChange,
  disabled,
  onBusyChange,
}) {
  const [createRows, setCreateRows] = useState([createOptionRow()]);

  const [createIsActive, setCreateIsActive] = useState(true);

  const [editingVariantId, setEditingVariantId] = useState(null);

  const [editRows, setEditRows] = useState([]);

  const [actionKey, setActionKey] = useState('');

  const [actionError, setActionError] = useState(null);

  const [message, setMessage] = useState('');

  const requestBusy = Boolean(actionKey);

  const busy = disabled || requestBusy;

  const variants = product.variants ?? [];

  useEffect(() => {
    onBusyChange(requestBusy || Boolean(editingVariantId));
  }, [editingVariantId, onBusyChange, requestBusy]);

  useEffect(() => {
    return () => {
      onBusyChange(false);
    };
  }, [onBusyChange]);

  function clearFeedback() {
    setActionError(null);
    setMessage('');
  }

  function updateRows(setRows, rowId, field, value) {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );

    clearFeedback();
  }

  function addRow(setRows) {
    setRows((current) => [...current, createOptionRow()]);

    clearFeedback();
  }

  function removeRow(setRows, rowId) {
    setRows((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((row) => row.id !== rowId);
    });

    clearFeedback();
  }

  async function handleCreateVariant() {
    const validation = validateOptionRows(createRows);

    if (validation.error) {
      setActionError(createLocalValidationError(validation.error));

      return;
    }

    clearFeedback();

    setActionKey('create');

    try {
      const updatedProduct = await addAdminProductVariant(product.id, {
        options: validation.options,
        isActive: createIsActive,
      });

      onProductChange(updatedProduct);

      setCreateRows([createOptionRow()]);
      setCreateIsActive(true);

      setMessage('Variant added successfully.');
    } catch (requestError) {
      setActionError(
        normalizeApiError(requestError, 'Unable to add this Variant.'),
      );
    } finally {
      setActionKey('');
    }
  }

  function handleStartEdit(variant) {
    clearFeedback();

    setEditingVariantId(variant.id);

    setEditRows(optionsToRows(variant.options));
  }

  function handleCancelEdit() {
    setEditingVariantId(null);

    setEditRows([]);

    clearFeedback();
  }

  async function handleSaveEdit(variant) {
    const validation = validateOptionRows(editRows);

    if (validation.error) {
      setActionError(createLocalValidationError(validation.error));

      return;
    }

    clearFeedback();

    setActionKey(`edit:${variant.id}`);

    try {
      const updatedProduct = await updateAdminProductVariant(
        product.id,
        variant.id,
        {
          options: validation.options,
        },
      );

      onProductChange(updatedProduct);

      setEditingVariantId(null);
      setEditRows([]);

      setMessage('Variant updated successfully.');
    } catch (requestError) {
      setActionError(
        normalizeApiError(requestError, 'Unable to update this Variant.'),
      );
    } finally {
      setActionKey('');
    }
  }

  async function handleStatusChange(variant) {
    const nextIsActive = !variant.isActive;

    if (!nextIsActive) {
      const confirmed = window.confirm('Deactivate this Variant?');

      if (!confirmed) {
        return;
      }
    }

    clearFeedback();

    setActionKey(`status:${variant.id}`);

    try {
      const updatedProduct = await updateAdminProductVariantStatus(
        product.id,
        variant.id,
        nextIsActive,
      );

      onProductChange(updatedProduct);

      setMessage(
        nextIsActive
          ? 'Variant activated successfully.'
          : 'Variant deactivated successfully.',
      );
    } catch (requestError) {
      setActionError(
        normalizeApiError(
          requestError,
          nextIsActive
            ? 'Unable to activate this Variant.'
            : 'Unable to deactivate this Variant.',
        ),
      );
    } finally {
      setActionKey('');
    }
  }

  return (
    <section className='border border-neutral-200 p-5'>
      <div>
        <h2 className='text-lg font-semibold'>Product variants</h2>

        <p className='mt-1 text-sm text-neutral-600'>
          Manage practical purchasable options such as size, color, weight or
          grip size. Variant changes are saved immediately.
        </p>

        <p className='mt-1 text-xs text-neutral-500'>
          Inventory, stock quantity, SKU and availability are managed separately
          in a later task.
        </p>
      </div>

      {message && (
        <div
          role='status'
          className='mt-5 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
          {message}
        </div>
      )}

      {actionError && (
        <div
          role='alert'
          className='mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          <p>{actionError.message}</p>

          {Object.values(actionError.fields ?? {}).map(
            (fieldMessage, index) => (
              <p key={`${fieldMessage}-${index}`} className='mt-1'>
                {fieldMessage}
              </p>
            ),
          )}
        </div>
      )}

      <div className='mt-6 border border-neutral-200 p-4'>
        <h3 className='text-sm font-semibold'>Add Variant</h3>

        <p className='mt-1 text-xs text-neutral-500'>
          Example: size → 9 and color → Black.
        </p>

        <div className='mt-4'>
          <OptionRowsEditor
            rows={createRows}
            prefix='create-variant'
            disabled={busy || Boolean(editingVariantId)}
            onChange={(rowId, field, value) =>
              updateRows(setCreateRows, rowId, field, value)
            }
            onAdd={() => addRow(setCreateRows)}
            onRemove={(rowId) => removeRow(setCreateRows, rowId)}
          />
        </div>

        <label className='mt-4 flex items-start gap-3'>
          <input
            type='checkbox'
            checked={createIsActive}
            disabled={busy || Boolean(editingVariantId)}
            onChange={(event) => {
              setCreateIsActive(event.target.checked);

              clearFeedback();
            }}
            className='mt-1 h-4 w-4'
          />

          <span>
            <span className='block text-sm font-medium'>Active Variant</span>

            <span className='mt-1 block text-xs text-neutral-500'>
              Inactive Variants remain stored and can be reactivated later.
            </span>
          </span>
        </label>

        <button
          type='button'
          disabled={busy || Boolean(editingVariantId)}
          onClick={handleCreateVariant}
          className='mt-4 bg-black px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'>
          {actionKey === 'create' ? 'Adding...' : 'Add Variant'}
        </button>
      </div>

      <div className='mt-6'>
        <h3 className='text-sm font-semibold'>Existing Variants</h3>

        {variants.length === 0 ? (
          <div className='mt-3 border border-dashed border-neutral-300 p-5'>
            <p className='text-sm text-neutral-500'>
              No Variants have been added to this Product.
            </p>
          </div>
        ) : (
          <div className='mt-3 grid gap-4 lg:grid-cols-2'>
            {variants.map((variant) => {
              const editing = editingVariantId === variant.id;

              return (
                <article
                  key={variant.id}
                  className='border border-neutral-200 p-4'>
                  <div className='flex items-start justify-between gap-4'>
                    <div>
                      <p className='text-sm font-semibold'>Variant</p>

                      <p className='mt-1 break-all text-xs text-neutral-400'>
                        ID: {variant.id}
                      </p>
                    </div>

                    <span
                      className={[
                        'px-2.5 py-1 text-xs font-medium',
                        variant.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-neutral-200 text-neutral-700',
                      ].join(' ')}>
                      {variant.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {editing ? (
                    <div className='mt-4'>
                      <OptionRowsEditor
                        rows={editRows}
                        prefix={`edit-${variant.id}`}
                        disabled={busy}
                        onChange={(rowId, field, value) =>
                          updateRows(setEditRows, rowId, field, value)
                        }
                        onAdd={() => addRow(setEditRows)}
                        onRemove={(rowId) => removeRow(setEditRows, rowId)}
                      />

                      <div className='mt-4 flex flex-wrap gap-2'>
                        <button
                          type='button'
                          disabled={busy}
                          onClick={() => handleSaveEdit(variant)}
                          className='bg-black px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'>
                          {actionKey === `edit:${variant.id}`
                            ? 'Saving...'
                            : 'Save Variant'}
                        </button>

                        <button
                          type='button'
                          disabled={busy}
                          onClick={handleCancelEdit}
                          className='border border-neutral-300 px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50'>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <dl className='mt-4 divide-y divide-neutral-200 border border-neutral-200'>
                        {Object.entries(variant.options ?? {}).map(
                          ([name, value]) => (
                            <div
                              key={name}
                              className='grid grid-cols-2 gap-3 p-3 text-sm'>
                              <dt className='font-medium'>{name}</dt>

                              <dd className='text-neutral-600'>
                                {String(value)}
                              </dd>
                            </div>
                          ),
                        )}
                      </dl>

                      <div className='mt-4 flex flex-wrap gap-2'>
                        <button
                          type='button'
                          disabled={busy || Boolean(editingVariantId)}
                          onClick={() => handleStartEdit(variant)}
                          className='border border-neutral-300 px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50'>
                          Edit options
                        </button>

                        <button
                          type='button'
                          disabled={busy || Boolean(editingVariantId)}
                          onClick={() => handleStatusChange(variant)}
                          className={[
                            'border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50',
                            variant.isActive
                              ? 'border-red-300 text-red-700'
                              : 'border-neutral-300',
                          ].join(' ')}>
                          {actionKey === `status:${variant.id}`
                            ? 'Updating...'
                            : variant.isActive
                              ? 'Deactivate'
                              : 'Activate'}
                        </button>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminProductVariantManager;
