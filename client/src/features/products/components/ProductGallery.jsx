import { useEffect, useState } from 'react';

import { getPreferredProductImage } from '../product.utils.js';

export function ProductGallery({ productId, productName, images = [] }) {
  const [selectedImageId, setSelectedImageId] = useState(null);

  useEffect(() => {
    const preferredImage = getPreferredProductImage(images);

    setSelectedImageId(preferredImage?.id ?? null);
  }, [images, productId]);

  const selectedImage =
    images.find((image) => image.id === selectedImageId) ??
    getPreferredProductImage(images);

  return (
    <section aria-label='Product gallery' className='min-w-0'>
      <div className='aspect-square overflow-hidden bg-[var(--color-surface)]'>
        {selectedImage?.url ? (
          <img
            src={selectedImage.url}
            alt={selectedImage.altText || productName}
            className='h-full w-full object-cover'
          />
        ) : (
          <div className='flex h-full items-center justify-center border border-[var(--color-border)] text-sm text-[var(--color-muted)]'>
            No image available
          </div>
        )}
      </div>

      {images.length > 1 ? (
        <div
          className='mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5'
          aria-label='Choose product image'>
          {images.map((image) => {
            const selected = image.id === selectedImage?.id;

            return (
              <button
                key={image.id}
                type='button'
                onClick={() => setSelectedImageId(image.id)}
                aria-pressed={selected}
                className={[
                  'aspect-square overflow-hidden border bg-[var(--color-surface)] transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2',

                  selected
                    ? 'border-[var(--color-ink)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]',
                ].join(' ')}>
                <img
                  src={image.url}
                  alt={image.altText || productName}
                  className='h-full w-full object-cover'
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
