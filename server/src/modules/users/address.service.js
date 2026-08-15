import { AppError } from '../../utils/AppError.js';

import { User } from './user.model.js';

function throwAuthenticationRequired() {
  throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
}

function throwAddressNotFound() {
  throw new AppError(404, 'NOT_FOUND', 'Address not found.');
}

function toSafeAddress(address) {
  return {
    id: address._id.toString(),
    fullName: address.fullName,
    phone: address.phone,
    address: address.address,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    isDefault: address.isDefault,
  };
}

function findOwnedAddress(user, addressId) {
  const address = user.addresses.find(
    (item) => item._id.toString() === addressId,
  );

  if (!address) {
    throwAddressNotFound();
  }

  return address;
}

async function getCustomerWithAddresses(userId) {
  const user = await User.findById(userId).select('addresses');

  if (!user) {
    throwAuthenticationRequired();
  }

  return user;
}

export async function getAuthenticatedCustomerAddresses(userId) {
  const user = await getCustomerWithAddresses(userId);

  return user.addresses.map(toSafeAddress);
}

export async function createAuthenticatedCustomerAddress(userId, input) {
  const user = await getCustomerWithAddresses(userId);

  if (input.isDefault) {
    for (const address of user.addresses) {
      address.isDefault = false;
    }
  }

  const createdAddress = user.addresses.create({
    fullName: input.fullName,
    phone: input.phone,
    address: input.address,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    country: input.country,
    isDefault: input.isDefault,
  });

  user.addresses.push(createdAddress);

  await user.save();

  return toSafeAddress(createdAddress);
}

export async function updateAuthenticatedCustomerAddress(
  userId,
  addressId,
  changes,
) {
  const user = await getCustomerWithAddresses(userId);

  const address = findOwnedAddress(user, addressId);

  for (const [field, value] of Object.entries(changes)) {
    address[field] = value;
  }

  await user.save();

  return toSafeAddress(address);
}

export async function deleteAuthenticatedCustomerAddress(userId, addressId) {
  const user = await getCustomerWithAddresses(userId);

  const addressIndex = user.addresses.findIndex(
    (address) => address._id.toString() === addressId,
  );

  if (addressIndex === -1) {
    throwAddressNotFound();
  }

  user.addresses.splice(addressIndex, 1);

  await user.save();
}

export async function setAuthenticatedCustomerDefaultAddress(
  userId,
  addressId,
) {
  const user = await getCustomerWithAddresses(userId);

  const selectedAddress = findOwnedAddress(user, addressId);

  for (const address of user.addresses) {
    address.isDefault =
      address._id.toString() === selectedAddress._id.toString();
  }

  await user.save();

  return user.addresses.map(toSafeAddress);
}
