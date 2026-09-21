const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protect all routes and restrict access to Managers and Auditors
router.use(protect);
router.use(authorize('MANAGER', 'AUDITOR'));

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Retrieve system audit logs
 *     tags: [Audit Logs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 */
router.get('/', getAuditLogs);

module.exports = router;