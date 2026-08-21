import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';

export function ProductPurchasePanel({
  authInitialized,
  user,

  quantity,

  cartInitialized,
  cartActionStatus,

  isCustomer,
  isCustomerCartBusy,

  productStockState,
  selectedVariant,

  purchaseError,
  purchaseSuccess,

  customerCartErrorMessage,

  onQuantityChange,
  onAddToCart,
}) {
  const productOutOfStock = productStockState === 'out_of_stock';

  const variantOutOfStock = selectedVariant?.stockState === 'out_of_stock';

  let buttonLabel = 'Add to cart';

  if (isCustomer && !cartInitialized) {
    buttonLabel = 'Loading cart...';
  } else if (isCustomer && cartActionStatus === 'loading') {
    buttonLabel = 'Adding...';
  } else if (productOutOfStock) {
    buttonLabel = 'Out of stock';
  }

  const feedbackError = purchaseError || customerCartErrorMessage;

  return (
    <section className='mt-8 border-t border-[var(--color-border)] pt-7'>
      <div>
        <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
          Purchase
        </p>

        <h2 className='mb-0 text-lg font-black tracking-[-0.02em]'>
          Add to cart
        </h2>
      </div>

      {!authInitialized ? (
        <p className='mt-4 mb-0 text-sm text-[var(--color-muted)]'>
          Checking your account...
        </p>
      ) : user && user.role !== 'customer' ? (
        <Alert variant='neutral' className='mt-4'>
          Add to Cart is available to Customer shopping accounts and Guests.
        </Alert>
      ) : (
        <>
          <div className='mt-5 max-w-36'>
            <Input
              id='product-quantity'
              label='Quantity'
              type='number'
              min='1'
              step='1'
              inputMode='numeric'
              value={quantity}
              disabled={isCustomerCartBusy || productOutOfStock}
              onChange={onQuantityChange}
            />
          </div>

          <Button
            type='button'
            size='lg'
            onClick={onAddToCart}
            disabled={
              isCustomerCartBusy || productOutOfStock || variantOutOfStock
            }
            isLoading={isCustomer && cartActionStatus === 'loading'}
            className='mt-5 w-full sm:w-auto sm:min-w-48'>
            {buttonLabel}
          </Button>
        </>
      )}

      {feedbackError ? (
        <Alert variant='danger' title='Unable to add to cart' className='mt-5'>
          {feedbackError}
        </Alert>
      ) : null}

      {purchaseSuccess ? (
        <Alert variant='success' className='mt-5'>
          {purchaseSuccess}
        </Alert>
      ) : null}
    </section>
  );
}
