import {
  ALLOWED_PROFILE_PHOTO_TYPES,
  PROFILE_PHOTO_MAX_SIZE,
} from './account.constants.js';

const PHONE_ALLOWED_REGEX = /^\+?[0-9\s()-]+$/;

export function isValidAccountPhone(phone) {
  const digitCount = phone.replace(/\D/g, '').length;

  return (
    phone.length <= 25 &&
    PHONE_ALLOWED_REGEX.test(phone) &&
    digitCount >= 7 &&
    digitCount <= 15
  );
}

export function validateProfilePhoto(file) {
  if (!file) {
    return 'Select an image first.';
  }

  if (!ALLOWED_PROFILE_PHOTO_TYPES.has(file.type)) {
    return 'Only JPEG, PNG, and WebP images are allowed.';
  }

  if (file.size > PROFILE_PHOTO_MAX_SIZE) {
    return 'Profile photo must be 5 MB or smaller.';
  }

  return null;
}

export function validateProfileForm(form) {
  const fields = {};

  const name = form.name.trim();

  const phone = form.phone.trim();

  if (!name) {
    fields.name = 'Name is required.';
  }

  if (phone && !isValidAccountPhone(phone)) {
    fields.phone = 'Enter a valid phone number.';
  }

  return {
    fields,

    payload: {
      name,

      phone: phone || null,
    },
  };
}

export function validateAddressForm(form) {
  const fields = {};

  const normalized = {
    fullName: form.fullName.trim(),

    phone: form.phone.trim(),

    address: form.address.trim(),

    city: form.city.trim(),

    state: form.state.trim(),

    postalCode: form.postalCode.trim(),

    country: form.country.trim(),
  };

  if (!normalized.fullName) {
    fields.fullName = 'Full name is required.';
  } else if (normalized.fullName.length > 100) {
    fields.fullName = 'Full name is too long.';
  }

  if (!normalized.phone || !isValidAccountPhone(normalized.phone)) {
    fields.phone = 'Enter a valid phone number.';
  }

  if (!normalized.address) {
    fields.address = 'Address is required.';
  } else if (normalized.address.length > 300) {
    fields.address = 'Address is too long.';
  }

  if (!normalized.city) {
    fields.city = 'City is required.';
  } else if (normalized.city.length > 100) {
    fields.city = 'City is too long.';
  }

  if (!normalized.state) {
    fields.state = 'State is required.';
  } else if (normalized.state.length > 100) {
    fields.state = 'State is too long.';
  }

  if (!normalized.postalCode) {
    fields.postalCode = 'Postal code is required.';
  } else if (normalized.postalCode.length > 20) {
    fields.postalCode = 'Postal code is too long.';
  }

  if (!normalized.country) {
    fields.country = 'Country is required.';
  } else if (normalized.country.length > 100) {
    fields.country = 'Country is too long.';
  }

  return {
    fields,
    normalized,
  };
}
