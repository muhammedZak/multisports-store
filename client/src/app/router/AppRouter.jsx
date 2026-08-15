import { Navigate, Route, Routes } from 'react-router';

import AuthLayout from '../../layouts/AuthLayout.jsx';

import LoginPage from '../../pages/auth/LoginPage.jsx';
import RegisterPage from '../../pages/auth/RegisterPage.jsx';
import VerifyEmailPage from '../../pages/auth/VerifyEmailPage.jsx';
import OtpLoginPage from '../../pages/auth/OtpLoginPage.jsx';
import ForgotPasswordPage from '../../pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from '../../pages/auth/ResetPasswordPage.jsx';

import AuthSessionPage from '../../pages/account/AuthSessionPage.jsx';

import RequireCustomer from '../../features/auth/RequireCustomer.jsx';
import RequireGuest from '../../features/auth/RequireGuest.jsx';
import SecurityPage from '../../pages/account/SecurityPage.jsx';
import ChangeEmailPage from '../../pages/account/ChangeEmailPage.jsx';

function AppRouter() {
  return (
    <Routes>
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
        <Route path='/account' element={<AuthSessionPage />} />
        <Route path='/account/security' element={<SecurityPage />} />
        <Route path='/account/security/email' element={<ChangeEmailPage />} />
      </Route>

      <Route path='/' element={<Navigate to='/auth/login' replace />} />

      <Route path='*' element={<Navigate to='/auth/login' replace />} />
    </Routes>
  );
}

export default AppRouter;
