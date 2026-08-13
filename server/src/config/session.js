import session from 'express-session';
import MongoStore from 'connect-mongo';

import { env } from './env.js';

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const sessionMiddleware = session({
  name: 'multisports.sid',

  secret: env.sessionSecret,

  resave: false,
  saveUninitialized: false,

  store: MongoStore.create({
    mongoUrl: env.mongodbUri,
    collectionName: 'sessions',
    ttl: SESSION_MAX_AGE_MS / 1000,
  }),

  cookie: {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_MS,
  },
});
