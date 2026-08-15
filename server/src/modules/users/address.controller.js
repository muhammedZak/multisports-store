import {
  validateAddressCreateInput,
  validateAddressUpdateInput,
} from './address.validation.js';

import {
  getAuthenticatedCustomerAddresses,
  createAuthenticatedCustomerAddress,
  updateAuthenticatedCustomerAddress,
  deleteAuthenticatedCustomerAddress,
  setAuthenticatedCustomerDefaultAddress,
} from './address.service.js';

export async function getMyAddresses(req, res) {
  const items = await getAuthenticatedCustomerAddresses(req.session.userId);

  res.status(200).json({
    success: true,
    data: {
      items,
    },
  });
}

export async function createMyAddress(req, res) {
  const input = validateAddressCreateInput(req.body);

  const address = await createAuthenticatedCustomerAddress(
    req.session.userId,
    input,
  );

  res.status(201).json({
    success: true,
    data: {
      address,
    },
  });
}

export async function updateMyAddress(req, res) {
  const input = validateAddressUpdateInput(req.body);

  const address = await updateAuthenticatedCustomerAddress(
    req.session.userId,
    req.params.addressId,
    input,
  );

  res.status(200).json({
    success: true,
    data: {
      address,
    },
  });
}

export async function deleteMyAddress(req, res) {
  await deleteAuthenticatedCustomerAddress(
    req.session.userId,
    req.params.addressId,
  );

  res.status(204).send();
}

export async function setMyDefaultAddress(req, res) {
  const items = await setAuthenticatedCustomerDefaultAddress(
    req.session.userId,
    req.params.addressId,
  );

  res.status(200).json({
    success: true,
    data: {
      items,
    },
  });
}
