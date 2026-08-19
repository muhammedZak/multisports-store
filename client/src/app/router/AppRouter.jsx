import { Navigate, Route, Routes } from 'react-router';

import AuthLayout from '../../layouts/AuthLayout.jsx';
import AdminLayout from '../../layouts/AdminLayout.jsx';
import StorefrontLayout from '../../layouts/StorefrontLayout.jsx';

import LoginPage from '../../pages/auth/LoginPage.jsx';
import RegisterPage from '../../pages/auth/RegisterPage.jsx';
import VerifyEmailPage from '../../pages/auth/VerifyEmailPage.jsx';
import OtpLoginPage from '../../pages/auth/OtpLoginPage.jsx';
import ForgotPasswordPage from '../../pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from '../../pages/auth/ResetPasswordPage.jsx';

import ProfilePage from '../../pages/account/ProfilePage.jsx';
import EditProfilePage from '../../pages/account/EditProfilePage.jsx';
import SecurityPage from '../../pages/account/SecurityPage.jsx';
import ChangeEmailPage from '../../pages/account/ChangeEmailPage.jsx';
import AddressesPage from '../../pages/account/AddressesPage.jsx';
import AddressFormPage from '../../pages/account/AddressFormPage.jsx';

import AdminCategoriesPage from '../../pages/admin/AdminCategoriesPage.jsx';
import AdminProductsPage from '../../pages/admin/AdminProductsPage.jsx';
import AdminProductDetailsPage from '../../pages/admin/AdminProductDetailsPage.jsx';
import AdminProductFormPage from '../../pages/admin/AdminProductFormPage.jsx';
import AdminInventoryPage from '../../pages/admin/AdminInventoryPage.jsx';
import AdminInventoryDetailsPage from '../../pages/admin/AdminInventoryDetailsPage.jsx';
import AdminCouponsPage from '../../pages/admin/AdminCouponsPage.jsx';
import AdminCouponFormPage from '../../pages/admin/AdminCouponFormPage.jsx';

import CatalogPage from '../../pages/storefront/CatalogPage.jsx';
import ProductDetailsPage from '../../pages/storefront/ProductDetailsPage.jsx';
import CartPage from '../../pages/storefront/CartPage.jsx';
import CheckoutPage from '../../pages/storefront/CheckoutPage.jsx';
import OrderConfirmationPage from '../../pages/storefront/OrderConfirmationPage.jsx';

import RequireAdmin from '../../features/auth/RequireAdmin.jsx';
import RequireCustomer from '../../features/auth/RequireCustomer.jsx';
import RequireGuest from '../../features/auth/RequireGuest.jsx';

function AppRouter() {
  return (
    <Routes>
      <Route element={<StorefrontLayout />}>
        <Route path='/shop' element={<CatalogPage mode='shop' />} />

        <Route path='/search' element={<CatalogPage mode='search' />} />

        <Route path='/products/:productId' element={<ProductDetailsPage />} />

        <Route path='/cart' element={<CartPage />} />

        <Route element={<RequireCustomer />}>
          <Route path='/checkout' element={<CheckoutPage />} />

          <Route
            path='/checkout/confirmation'
            element={<OrderConfirmationPage />}
          />
        </Route>
      </Route>

      <Route element={<AuthLayout />}>
        <Route element={<RequireGuest />}>
          <Route path='/auth/login' element={<LoginPage />} />

          <Route path='/auth/login-otp' element={<OtpLoginPage />} />

          <Route
            path='/auth/forgot-password'
            element={<ForgotPasswordPage />}
          />

          <Route path='/auth/reset-password' element={<ResetPasswordPage />} />

          <Route path='/auth/register' element={<RegisterPage />} />

          <Route path='/auth/verify-email' element={<VerifyEmailPage />} />
        </Route>
      </Route>

      <Route element={<RequireCustomer />}>
        <Route path='/account' element={<ProfilePage />} />

        <Route path='/account/profile/edit' element={<EditProfilePage />} />

        <Route path='/account/security' element={<SecurityPage />} />

        <Route path='/account/security/email' element={<ChangeEmailPage />} />

        <Route path='/account/addresses' element={<AddressesPage />} />

        <Route path='/account/addresses/new' element={<AddressFormPage />} />

        <Route
          path='/account/addresses/:addressId/edit'
          element={<AddressFormPage />}
        />
      </Route>

      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route
            path='/admin'
            element={<Navigate to='/admin/products' replace />}
          />

          <Route path='/admin/products' element={<AdminProductsPage />} />

          <Route
            path='/admin/products/new'
            element={<AdminProductFormPage />}
          />

          <Route
            path='/admin/products/:productId'
            element={<AdminProductDetailsPage />}
          />

          <Route
            path='/admin/products/:productId/edit'
            element={<AdminProductFormPage />}
          />

          <Route path='/admin/categories' element={<AdminCategoriesPage />} />

          <Route path='/admin/inventory' element={<AdminInventoryPage />} />

          <Route
            path='/admin/inventory/:inventoryId'
            element={<AdminInventoryDetailsPage />}
          />

          <Route path='/admin/coupons' element={<AdminCouponsPage />} />

          <Route path='/admin/coupons/new' element={<AdminCouponFormPage />} />

          <Route
            path='/admin/coupons/:couponId/edit'
            element={<AdminCouponFormPage />}
          />
        </Route>
      </Route>

      <Route path='/' element={<Navigate to='/shop' replace />} />

      <Route path='*' element={<Navigate to='/shop' replace />} />
    </Routes>
  );
}

export default AppRouter;
