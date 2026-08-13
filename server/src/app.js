import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import { corsOptions } from './config/cors.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

import { sessionMiddleware } from './config/session.js';
import authRouter from './modules/auth/auth.routes.js';

const app = express();

app.use(helmet());

app.use(cors(corsOptions));

if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(sessionMiddleware);

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
    },
  });
});

app.use('/api/v1/auth', authRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
