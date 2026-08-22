import { useParams } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';

import { AdminCouponForm } from '../../features/coupons/components/AdminCouponForm.jsx';

import { useAdminCouponForm } from '../../features/coupons/hooks/useAdminCouponForm.js';

function AdminCouponFormPage() {
  const { couponId } = useParams();

  const couponForm = useAdminCouponForm(couponId);

  if (couponForm.loading) {
    return (
      <main className='p-5 sm:p-6'>
        <Skeleton className='h-8 w-52' />
        <Skeleton className='mt-8 h-96 w-full' />
      </main>
    );
  }

  if (couponForm.loadError && !couponForm.coupon) {
    return (
      <main className='p-5 sm:p-6'>
        <AdminPageHeader
          eyebrow='Promotion management'
          title='Coupon unavailable'
          backTo='/admin/coupons'
          backLabel='Coupons'
        />

        <Alert variant='danger' className='mt-6'>
          {couponForm.loadError.message}
        </Alert>

        <Button type='button' className='mt-5' onClick={couponForm.loadCoupon}>
          Try again
        </Button>
      </main>
    );
  }

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Promotion management'
        title={
          couponForm.editMode ? `Edit ${couponForm.coupon.code}` : 'Add Coupon'
        }
        description={
          couponForm.editMode
            ? 'Update this Coupon configuration. Activation remains a separate operation from the Coupon list.'
            : 'Configure a percentage or fixed-amount Coupon for the store.'
        }
        backTo='/admin/coupons'
        backLabel='Coupons'
      />

      <AdminCouponForm model={couponForm} />
    </main>
  );
}

export default AdminCouponFormPage;
