import { Router } from 'express';
import { getDatabaseStatus } from '../config/database.js';
import { sendSuccess } from '../common/utils/response.js';
import authRoutes from '../modules/auth/auth.routes.js';
import studentRoutes from '../modules/students/student.routes.js';
import semesterRoutes from '../modules/semesters/semester.routes.js';
import dormitoryRoutes from '../modules/dormitories/dormitory.routes.js';
import configRoutes from '../modules/configs/config.routes.js';
import importRoutes from '../modules/imports/import.routes.js';
import roomAssignmentRoutes from '../modules/roomAssignments/roomAssignment.routes.js';
import regulationRoutes from '../modules/regulations/regulation.routes.js';
import notificationRoutes from '../modules/notifications/notification.routes.js';
import studentRequestRoutes from '../modules/studentRequests/studentRequest.routes.js';
import violationRoutes from '../modules/violations/violation.routes.js';
import utilityUsageRoutes from '../modules/utilityUsages/utilityUsage.routes.js';
import utilityBillRoutes from '../modules/utilityBills/utilityBill.routes.js';
import paymentRoutes from '../modules/payments/payment.routes.js';
import electricPriceTierRoutes from '../modules/configs/electricPriceTier.routes.js';
import auditLogRoutes from '../modules/auditLogs/auditLog.routes.js';
import reportRoutes from '../modules/reports/report.routes.js';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';
import userRoutes from '../modules/users/user.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  sendSuccess(res, {
    uptime: Math.floor(process.uptime()),
    db: getDatabaseStatus(),
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/semesters', semesterRoutes);
router.use('/', dormitoryRoutes);
router.use('/configs', configRoutes);
router.use('/', importRoutes);
router.use('/room-assignments', roomAssignmentRoutes);
router.use('/regulations', regulationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/student-requests', studentRequestRoutes);
router.use('/violations', violationRoutes);
router.use('/utility-usages', utilityUsageRoutes);
router.use('/utility-bills', utilityBillRoutes);
router.use('/payments', paymentRoutes);
router.use('/electric-price-tiers', electricPriceTierRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);

export default router;
