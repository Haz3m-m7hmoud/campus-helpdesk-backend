const express = require('express');
const router = express.Router();
const { 
    getServiceDashboard, 
    getDemandDashboard, 
    getManagerSummary 
} = require('../controllers/dashboardController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Protect all dashboard routes (restricted to Manager, Auditor, and Agent)
router.use(protect);
router.use(authorize('MANAGER', 'AUDITOR', 'AGENT'));

/**
 * @swagger
 * /api/dashboard/service:
 *   get:
 *     summary: Get service performance and SLA statistics
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved service dashboard data
 */
router.get('/service', getServiceDashboard);

/**
 * @swagger
 * /api/dashboard/demand:
 *   get:
 *     summary: Get demand volume and incident statistics
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved demand dashboard data
 */
router.get('/demand', getDemandDashboard);

/**
 * @swagger
 * /api/dashboard/manager:
 *   get:
 *     summary: Get manager summary and technician workload
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved manager summary data
 */
router.get('/manager', getManagerSummary);

module.exports = router;