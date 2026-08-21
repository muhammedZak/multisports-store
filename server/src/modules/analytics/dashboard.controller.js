import { getAdminDashboard } from './dashboard.service.js';

export async function getAdminDashboardController(req, res, next) {
  try {
    const dashboard = await getAdminDashboard();

    return res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    return next(error);
  }
}
