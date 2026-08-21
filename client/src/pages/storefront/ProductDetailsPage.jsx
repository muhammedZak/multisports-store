import { useEffect, useState } from 'react';

import { Link, useParams } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { ProductGallery } from '../../features/products/components/ProductGallery.jsx';
import { ProductInformation } from '../../features/products/components/ProductInformation.jsx';
import { ProductPurchasePanel } from '../../features/products/components/ProductPurchasePanel.jsx';
import { ProductSummary } from '../../features/products/components/ProductSummary.jsx';
import { ProductVariantSelector } from '../../features/products/components/ProductVariantSelector.jsx';

import { useProductDetails } from '../../features/products/hooks/useProductDetails.js';
import { useProductPurchase } from '../../features/products/hooks/useProductPurchase.js';

import ProductReviewsSection from '../../features/review/ProductReviewsSection.jsx';

function ProductDetailsLoading() {
  return (
    <main className='ds-container py-8 lg:py-12'>
      <Skeleton className='h-4 w-28' />

      <div className='mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14'>
        <div>
          <Skeleton className='aspect-square w-full' />

          <div className='mt-3 grid grid-cols-4 gap-2'>
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <Skeleton key={index} className='aspect-square w-full' />
            ))}
          </div>
        </div>

        <div className='lg:pt-2'>
          <Skeleton className='h-3 w-24' />

          <Skeleton className='mt-4 h-10 w-4/5' />

          <Skeleton className='mt-3 h-10 w-2/3' />

          <Skeleton className='mt-5 h-4 w-40' />

          <div className='mt-7 border-y border-[var(--color-border)] py-6'>
            <Skeleton className='h-8 w-32' />

            <Skeleton className='mt-3 h-4 w-40' />
          </div>

          <Skeleton className='mt-8 h-24 w-full' />

          <Skeleton className='mt-4 h-12 w-48' />
        </div>
      </div>
    </main>
  );
}

function ProductDetailsPage() {
  const { productId } = useParams();

  const [selectedVariantId, setSelectedVariantId] = useState('');

  const {
    product,
    loading,
    error,

    retry,
    updateRatingSummary,
  } = useProductDetails(productId);

  useEffect(() => {
    /*
     * Never carry a Variant
     * selection across Products.
     */
    setSelectedVariantId('');
  }, [productId]);

  const purchase = useProductPurchase({
    product,
    productId,
    selectedVariantId,
  });

  function handleVariantSelection(variantId) {
    setSelectedVariantId(variantId);

    purchase.clearFeedback();
  }

  if (loading) {
    return <ProductDetailsLoading />;
  }

  if (error?.code === 'PRODUCT_NOT_FOUND') {
    return (
      <main className='ds-container py-16 lg:py-20'>
        <div className='max-w-xl border-t border-[var(--color-border)] pt-8'>
          <p className='mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted)]'>
            Product not found
          </p>

          <h1 className='mb-0 text-3xl font-black tracking-[-0.04em] sm:text-4xl'>
            This product is unavailable.
          </h1>

          <p className='mt-4 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
            The product may no longer be available or the link may be invalid.
          </p>

          <Link
            to='/shop'
            className='mt-6 inline-flex min-h-10 items-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-4 text-sm font-semibold text-white transition hover:bg-[#2b2b2b]'>
            Back to shop
          </Link>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className='ds-container py-16'>
        <div className='max-w-xl'>
          <Alert variant='danger' title='Unable to load product'>
            {error.message}
          </Alert>

          <div className='mt-5 flex flex-wrap gap-3'>
            <Button type='button' onClick={retry}>
              Try again
            </Button>

            <Link
              to='/shop'
              className='inline-flex min-h-10 items-center border border-[var(--color-border-strong)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-ink)]'>
              Back to shop
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className='ds-container py-16'>
        <div className='max-w-xl'>
          <Alert variant='warning' title='Product unavailable'>
            Unable to display this product.
          </Alert>

          <Button type='button' onClick={retry} className='mt-5'>
            Try again
          </Button>
        </div>
      </main>
    );
  }

  const images = product.images ?? [];

  const variants = product.variants ?? [];

  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? null;

  return (
    <main className='ds-container py-8 lg:py-12'>
      <nav
        aria-label='Product breadcrumb'
        className='flex flex-wrap items-center gap-2 text-sm text-[var(--color-muted)]'>
        <Link
          to='/shop'
          className='font-semibold hover:text-[var(--color-ink)] hover:underline hover:underline-offset-4'>
          Shop
        </Link>

        <span aria-hidden='true'>/</span>

        <span className='capitalize'>{product.sport}</span>

        {product.category?.name ? (
          <>
            <span aria-hidden='true'>/</span>

            <span>{product.category.name}</span>
          </>
        ) : null}
      </nav>

      <div className='mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)] lg:gap-14 xl:gap-20'>
        <ProductGallery
          productId={product.id}
          productName={product.name}
          images={images}
        />

        <section className='min-w-0 lg:pt-1'>
          <ProductSummary product={product} />

          <ProductVariantSelector
            variants={variants}
            selectedVariantId={selectedVariantId}
            disabled={
              purchase.isCustomer && purchase.cartActionStatus === 'loading'
            }
            onSelect={handleVariantSelection}
          />

          <ProductPurchasePanel
            authInitialized={purchase.authInitialized}
            user={purchase.user}
            quantity={purchase.quantity}
            cartInitialized={purchase.cartInitialized}
            cartActionStatus={purchase.cartActionStatus}
            isCustomer={purchase.isCustomer}
            isCustomerCartBusy={purchase.isCustomerCartBusy}
            productStockState={product.stockState}
            selectedVariant={selectedVariant}
            purchaseError={purchase.purchaseError}
            purchaseSuccess={purchase.purchaseSuccess}
            customerCartErrorMessage={purchase.customerCartErrorMessage}
            onQuantityChange={purchase.handleQuantityChange}
            onAddToCart={purchase.addToCart}
          />
        </section>
      </div>

      <ProductInformation
        description={product.description}
        specifications={product.specifications ?? {}}
      />

      <ProductReviewsSection
        productId={product.id}
        user={purchase.user}
        authInitialized={purchase.authInitialized}
        averageRating={product.averageRating ?? null}
        reviewCount={product.reviewCount ?? 0}
        onRatingSummaryChange={updateRatingSummary}
      />
    </main>
  );
}

export default ProductDetailsPage;
