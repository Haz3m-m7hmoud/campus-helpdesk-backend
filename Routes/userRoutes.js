const express = require('express');
const router = express.Router();
const { login, register, getMe, createStaff } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ==========================================
// Public Routes
// ==========================================

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: User login
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', login);

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new student (Reporter)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201:
 *         description: Account created successfully
 */
router.post('/register', register); 

// ==========================================
// Protected Routes
// ==========================================
router.use(protect);

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current logged-in user data
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data retrieved successfully
 */
router.get('/me', getMe);

/**
 * @swagger
 * /api/users/staff:
 *   post:
 *     summary: Create staff account (Manager Only)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: [AGENT, TECHNICIAN, AUDITOR] }
 *               team_id: { type: integer }
 *     responses:
 *       201:
 *         description: Staff account created successfully
 */
router.post('/staff', authorize('MANAGER'), createStaff);

module.exports = router;