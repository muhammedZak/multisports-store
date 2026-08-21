import { validateAdminAnalyticsQuery } from './analytics.validation.js';

import { getAdminAnalyticsFoundation } from './analytics.service.js';

export async function getAdminAnalyticsController(req, res, next) {
  try {
    const { range } = validateAdminAnalyticsQuery(req.query);

    const analytics = await getAdminAnalyticsFoundation(range);

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    return next(error);
  }
}
