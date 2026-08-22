import { useEffect, useState } from 'react';

import {
  addAdminProductImages,
  deleteAdminProductImage,
  fetchAdminProduct,
  updateAdminProductImage,
} from '../../../api/productApi.js';

import { normalizeApiError } from '../../../api/errors.js';

const MAX_IMAGES_PER_REQUEST = 5;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function validateSelectedImages(images) {
  if (images.length === 0) {
    return 'Select at least one image.';
  }

  if (images.length > MAX_IMAGES_PER_REQUEST) {
    return 'You can upload a maximum of 5 images per request.';
  }

  const invalidType = images.some(
    (image) => !ALLOWED_IMAGE_TYPES.has(image.type),
  );

  if (invalidType) {
    return 'Only JPEG, PNG and WebP images are allowed.';
  }

  const tooLarge = images.some((image) => image.size > MAX_IMAGE_SIZE);

  if (tooLarge) {
    return 'Each image must be 5 MB or smaller.';
  }

  return null;
}

function AdminProductImageManager({
  product,
  onProductChange,
  disabled,
  onBusyChange,
}) {
  const [selectedImages, setSelectedImages] = useState([]);

  const [uploadError, setUploadError] = useState('');

  const [actionError, setActionError] = useState(null);

  const [message, setMessage] = useState('');

  const [actionKey, setActionKey] = useState('');

  const [uploadInputKey, setUploadInputKey] = useState(0);

  const [altDrafts, setAltDrafts] = useState({});

  const busy = disabled || Boolean(actionKey);

  const orderedImages = [...(product.images ?? [])].sort(
    (first, second) => first.sortOrder - second.sortOrder,
  );

  useEffect(() => {
    setAltDrafts((current) => {
      const next = {};

      for (const image of product.images ?? []) {
        next[image.id] = Object.prototype.hasOwnProperty.call(current, image.id)
          ? current[image.id]
          : (image.altText ?? '');
      }

      return next;
    });
  }, [product.images]);

  useEffect(() => {
    onBusyChange(Boolean(actionKey));
  }, [actionKey, onBusyChange]);

  useEffect(() => {
    return () => {
      onBusyChange(false);
    };
  }, [onBusyChange]);

  function clearFeedback() {
    setActionError(null);
    setMessage('');
  }

  function handleSelectedImagesChange(event) {
    const files = Array.from(event.target.files ?? []);

    setSelectedImages(files);

    setUploadError(validateSelectedImages(files) ?? '');

    clearFeedback();
  }

  async function handleUpload() {
    const validationError = validateSelectedImages(selectedImages);

    if (validationError) {
      setUploadError(validationError);

      return;
    }

    clearFeedback();

    setUploadError('');

    setActionKey('upload');

    try {
      const updatedProduct = await addAdminProductImages(
        product.id,
        selectedImages,
      );

      onProductChange(updatedProduct);

      setSelectedImages([]);

      setUploadInputKey((current) => current + 1);

      setMessage(
        selectedImages.length === 1
          ? 'Image uploaded successfully.'
          : `${selectedImages.length} images uploaded successfully.`,
      );
    } catch (requestError) {
      setActionError(
        normalizeApiError(requestError, 'Unable to upload product images.'),
      );
    } finally {
      setActionKey('');
    }
  }

  function handleAltTextChange(imageId, value) {
    setAltDrafts((current) => ({
      ...current,
      [imageId]: value,
    }));

    clearFeedback();
  }

  async function handleAltTextSave(image) {
    const altText = (altDrafts[image.id] ?? '').trim();

    if (!altText) {
      setActionError({
        code: 'VALIDATION_ERROR',
        message: 'Please correct the invalid fields.',
        fields: {
          altText: 'Image alt text is required.',
        },
      });

      return;
    }

    clearFeedback();

    setActionKey(`alt:${image.id}`);

    try {
      const updatedProduct = await updateAdminProductImage(
        product.id,
        image.id,
        {
          altText,
        },
      );

      onProductChange(updatedProduct);

      setAltDrafts((current) => ({
        ...current,
        [image.id]: altText,
      }));

      setMessage('Image alt text updated successfully.');
    } catch (requestError) {
      setActionError(
        normalizeApiError(requestError, 'Unable to update image alt text.'),
      );
    } finally {
      setActionKey('');
    }
  }

  async function handleSetPrimary(image) {
    if (image.isPrimary) {
      return;
    }

    clearFeedback();

    setActionKey(`primary:${image.id}`);

    try {
      const updatedProduct = await updateAdminProductImage(
        product.id,
        image.id,
        {
          isPrimary: true,
        },
      );

      onProductChange(updatedProduct);

      setMessage('Primary image updated successfully.');
    } catch (requestError) {
      setActionError(
        normalizeApiError(requestError, 'Unable to change the primary image.'),
      );
    } finally {
      setActionKey('');
    }
  }

  async function handleMove(image, targetSortOrder) {
    if (targetSortOrder < 0 || targetSortOrder >= orderedImages.length) {
      return;
    }

    clearFeedback();

    setActionKey(`order:${image.id}`);

    try {
      const updatedProduct = await updateAdminProductImage(
        product.id,
        image.id,
        {
          sortOrder: targetSortOrder,
        },
      );

      onProductChange(updatedProduct);

      setMessage('Image order updated successfully.');
    } catch (requestError) {
      setActionError(
        normalizeApiError(requestError, 'Unable to change the image order.'),
      );
    } finally {
      setActionKey('');
    }
  }

  async function handleDelete(image) {
    if (orderedImages.length === 1) {
      return;
    }

    const confirmed = window.confirm(
      `Delete this image from "${product.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    clearFeedback();

    setActionKey(`delete:${image.id}`);

    let deletionSucceeded = false;

    try {
      await deleteAdminProductImage(product.id, image.id);

      deletionSucceeded = true;

      const refreshedProduct = await fetchAdminProduct(product.id);

      onProductChange(refreshedProduct);

      setMessage('Image deleted successfully.');
    } catch (requestError) {
      setActionError(
        normalizeApiError(
          requestError,
          deletionSucceeded
            ? 'The image was deleted, but the latest product could not be reloaded. Refresh the page.'
            : 'Unable to delete this product image.',
        ),
      );
    } finally {
      setActionKey('');
    }
  }

  return (
    <section className='border border-neutral-200 p-5'>
      <div>
        <h2 className='text-lg font-semibold'>Product images</h2>

        <p className='mt-1 text-sm text-neutral-600'>
          Upload images, edit alt text, select the primary image, change display
          order or remove images. Image changes are saved immediately.
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
        <h3 className='text-sm font-semibold'>Add more images</h3>

        <p className='mt-1 text-xs text-neutral-500'>
          Upload 1–5 JPEG, PNG or WebP images per request. Each image must be 5
          MB or smaller.
        </p>

        <input
          key={uploadInputKey}
          type='file'
          multiple
          accept='image/jpeg,image/png,image/webp'
          disabled={busy}
          onChange={handleSelectedImagesChange}
          className='mt-4 block w-full text-sm'
        />

        {selectedImages.length > 0 && (
          <ul className='mt-3 space-y-1 text-sm text-neutral-600'>
            {selectedImages.map((image) => (
              <li key={`${image.name}-${image.size}`}>{image.name}</li>
            ))}
          </ul>
        )}

        {uploadError && (
          <p className='mt-3 text-sm text-red-600'>{uploadError}</p>
        )}

        <button
          type='button'
          disabled={busy || selectedImages.length === 0 || Boolean(uploadError)}
          onClick={handleUpload}
          className='mt-4 bg-black px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'>
          {actionKey === 'upload' ? 'Uploading...' : 'Upload selected images'}
        </button>
      </div>

      <div className='mt-6 grid gap-5 lg:grid-cols-2'>
        {orderedImages.map((image, index) => {
          const altDraft = altDrafts[image.id] ?? '';

          const altTextChanged = altDraft.trim() !== (image.altText ?? '');

          return (
            <article key={image.id} className='border border-neutral-200 p-4'>
              <div className='relative'>
                <img
                  src={image.url}
                  alt={image.altText || product.name}
                  className='aspect-square w-full object-cover'
                />

                {image.isPrimary && (
                  <span className='absolute left-3 top-3 bg-black px-2.5 py-1 text-xs font-medium text-white'>
                    Primary
                  </span>
                )}
              </div>

              <p className='mt-3 text-xs text-neutral-500'>
                Display order: {image.sortOrder}
              </p>

              <div className='mt-4'>
                <label
                  htmlFor={`image-alt-${image.id}`}
                  className='mb-2 block text-sm font-medium'>
                  Alt text
                </label>

                <input
                  id={`image-alt-${image.id}`}
                  type='text'
                  disabled={busy}
                  value={altDraft}
                  onChange={(event) =>
                    handleAltTextChange(image.id, event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();

                      handleAltTextSave(image);
                    }
                  }}
                  className='w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-black disabled:bg-neutral-100'
                />

                <button
                  type='button'
                  disabled={busy || !altTextChanged}
                  onClick={() => handleAltTextSave(image)}
                  className='mt-2 border border-neutral-300 px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50'>
                  {actionKey === `alt:${image.id}`
                    ? 'Saving...'
                    : 'Save alt text'}
                </button>
              </div>

              <div className='mt-5 flex flex-wrap gap-2'>
                <button
                  type='button'
                  disabled={busy || image.isPrimary}
                  onClick={() => handleSetPrimary(image)}
                  className='border border-neutral-300 px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50'>
                  {actionKey === `primary:${image.id}`
                    ? 'Updating...'
                    : image.isPrimary
                      ? 'Primary image'
                      : 'Set as primary'}
                </button>

                <button
                  type='button'
                  disabled={busy || index === 0}
                  onClick={() => handleMove(image, index - 1)}
                  className='border border-neutral-300 px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50'>
                  Move up
                </button>

                <button
                  type='button'
                  disabled={busy || index === orderedImages.length - 1}
                  onClick={() => handleMove(image, index + 1)}
                  className='border border-neutral-300 px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50'>
                  Move down
                </button>

                <button
                  type='button'
                  disabled={busy || orderedImages.length === 1}
                  title={
                    orderedImages.length === 1
                      ? 'A product must keep at least one image.'
                      : undefined
                  }
                  onClick={() => handleDelete(image)}
                  className='border border-red-300 px-3 py-2 text-xs font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50'>
                  {actionKey === `delete:${image.id}`
                    ? 'Deleting...'
                    : 'Delete'}
                </button>
              </div>

              {orderedImages.length === 1 && (
                <p className='mt-3 text-xs text-neutral-500'>
                  This is the final image and cannot be deleted.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default AdminProductImageManager;
