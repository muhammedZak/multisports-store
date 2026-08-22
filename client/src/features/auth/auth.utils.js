export function normalizeNumericOtp(value) {
  return value.replace(/\D/g, '').slice(0, 6);
}

export function getPasswordLoginDestination(user, returnTo) {
  if (returnTo) {
    return returnTo;
  }

  return user?.role === 'admin' ? '/admin/categories' : '/account';
}

export function getCustomerAuthDestination(returnTo) {
  return returnTo || '/account';
}
