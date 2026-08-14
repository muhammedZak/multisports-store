import { Navigate, Route, Routes } from 'react-router';

import AuthLayout from '../../layouts/AuthLayout.jsx';

import LoginPage from '../../pages/auth/LoginPage.jsx';
import RegisterPage from '../../pages/auth/RegisterPage.jsx';
import VerifyEmailPage from '../../pages/auth/VerifyEmailPage.jsx';
import OtpLoginPage from '../../pages/auth/OtpLoginPage.jsx';

import AuthSessionPage from '../../pages/account/AuthSessionPage.jsx';

import RequireCustomer from '../../features/auth/RequireCustomer.jsx';
import RequireGuest from '../../features/auth/RequireGuest.jsx';

function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route element={<RequireGuest />}>
          <Route path='/auth/login' element={<LoginPage />} />

          <Route path='/auth/login-otp' element={<OtpLoginPage />} />

          <Route path='/auth/register' element={<RegisterPage />} />

          <Route path='/auth/verify-email' element={<VerifyEmailPage />} />
        </Route>
      </Route>

      <Route element={<RequireCustomer />}>
        <Route path='/account' element={<AuthSessionPage />} />
      </Route>

      <Route path='/' element={<Navigate to='/auth/login' replace />} />

      <Route path='*' element={<Navigate to='/auth/login' replace />} />
    </Routes>
  );
}

export default AppRouter;
