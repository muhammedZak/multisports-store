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
import userRouter from './modules/users/user.routes.js';
import categoryRouter from './modules/catalog/category.routes.js';
import adminCategoryRouter from './modules/catalog/adminCategory.routes.js';
import adminProductRouter from './modules/catalog/adminProduct.routes.js';
import publicCatalogRouter from './modules/catalog/publicCatalog.routes.js';
import adminInventoryRouter from './modules/inventory/adminInventory.routes.js';
import adminCouponRouter from './modules/coupon/adminCoupon.routes.js';

import cartRouter from './modules/cart/cart.routes.js';

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
app.use('/api/v1/users', userRouter);
app.use('/api/v1', categoryRouter);
app.use('/api/v1', publicCatalogRouter);

app.use('/api/v1/cart', cartRouter);

app.use('/api/v1/admin/categories', adminCategoryRouter);
app.use('/api/v1/admin/products', adminProductRouter);
app.use('/api/v1/admin/inventory', adminInventoryRouter);
app.use('/api/v1/admin/coupons', adminCouponRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
