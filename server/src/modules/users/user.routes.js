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

export default router;
