export const PROFILE_PHOTO_MAX_SIZE = 5 * 1024 * 1024;

export const ALLOWED_PROFILE_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const EMAIL_CHANGE_RESEND_COOLDOWN_SECONDS = 60;

export const EMPTY_ADDRESS_FORM = {
  fullName: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  isDefault: false,
};
