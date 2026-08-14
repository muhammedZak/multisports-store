import { OAuth2Client } from 'google-auth-library';

import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const googleClient = new OAuth2Client();

export async function verifyGoogleCredential(credential) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.googleClientId,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload?.email || payload.email_verified !== true) {
      throw new Error('Required Google identity claims are missing');
    }

    return {
      sub: payload.sub,
      email: payload.email.trim().toLowerCase(),
      name: typeof payload.name === 'string' ? payload.name.trim() : '',
    };
  } catch {
    throw new AppError(
      401,
      'GOOGLE_CREDENTIAL_INVALID',
      'Google sign-in could not be verified.',
    );
  }
}
