import { Router } from 'express';

import {
  requireAuth,
  requireCustomer,
} from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import { uploadSingleProfilePhoto } from './profilePhoto.upload.js';

import {
  getMyProfile,
  updateMyProfile,
  updateMyProfilePhoto,
  deleteMyProfilePhoto,
} from './user.controller.js';

import {
  getMyAddresses,
  createMyAddress,
  updateMyAddress,
  deleteMyAddress,
  setMyDefaultAddress,
} from './address.controller.js';

const router = Router();

router.get('/me', requireAuth, requireCustomer, getMyProfile);

router.patch('/me', requireAuth, requireCustomer, requireCsrf, updateMyProfile);

router.put(
  '/me/profile-photo',
  requireAuth,
  requireCustomer,
  requireCsrf,
  uploadSingleProfilePhoto,
  updateMyProfilePhoto,
);

router.delete(
  '/me/profile-photo',
  requireAuth,
  requireCustomer,
  requireCsrf,
  deleteMyProfilePhoto,
);

router.get('/me/addresses', requireAuth, requireCustomer, getMyAddresses);

router.post(
  '/me/addresses',
  requireAuth,
  requireCustomer,
  requireCsrf,
  createMyAddress,
);

router.patch(
  '/me/addresses/:addressId',
  requireAuth,
  requireCustomer,
  requireCsrf,
  updateMyAddress,
);

router.delete(
  '/me/addresses/:addressId',
  requireAuth,
  requireCustomer,
  requireCsrf,
  deleteMyAddress,
);

router.patch(
  '/me/addresses/:addressId/default',
  requireAuth,
  requireCustomer,
  requireCsrf,
  setMyDefaultAddress,
);

export default router;
