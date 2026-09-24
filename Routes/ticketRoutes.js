const express = require('express');
const router = express.Router();
const { 
    createTicket, 
    getAllTickets, 
    getTicketById, 
    updateTicket, 
    deleteTicket,
    getAnalyticsData,
    assignTicket,
    analyzeTicket // 👈 تم إضافة الدالة هنا
} = require('../controllers/ticketController');

const { protect, authorize } = require('../middleware/authMiddleware');

// ==========================================
// 🛡️ INPUT VALIDATION MIDDLEWARE
// ==========================================
const validateTicketInput = (req, res, next) => {
    const { title, description, category_id, location_id } = req.body; 
    
    if (!title || !description || !category_id || !location_id) {
        return res.status(400).json({ 
            success: false, 
            message: 'Please provide all required fields: title, description, category_id, location_id' 
        });
    }
    next();
};

// ==========================================
// 🔗 TICKET ROUTES & SWAGGER DOCUMENTATION
// ==========================================

/**
 * @swagger
 * /api/tickets/analytics:
 *   get:
 *     summary: Retrieve dashboard statistics (Managers & Agents only)
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/analytics', protect, authorize('MANAGER', 'AGENT'), getAnalyticsData);

/**
 * @swagger
 * /api/tickets/{id}/assign:
 *   put:
 *     summary: Assign a ticket to a specific technician
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               technician_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ticket assigned successfully
 */
router.put('/:id/assign', protect, authorize('AGENT', 'MANAGER'), assignTicket);

/**
 * @swagger
 * /api/tickets/{id}/analyze:
 *   post:
 *     summary: Analyze a ticket using AI
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: AI suggestion retrieved successfully
 */
// 👈 تم إضافة مسار الـ AI هنا
router.post('/:id/analyze', protect, authorize('AGENT', 'MANAGER'), analyzeTicket);

/**
 * @swagger
 * /api/tickets:
 *   post:
 *     summary: Create a new ticket
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category_id:
 *                 type: integer
 *               location_id:
 *                 type: integer
 *               urgency:
 *                 type: string
 *                 enum: [High, Medium, Low]
 *               impact:
 *                 type: string
 *                 enum: [High, Medium, Low]
 *     responses:
 *       201:
 *         description: Ticket created successfully
 */
router.post('/', protect, validateTicketInput, createTicket);

/**
 * @swagger
 * /api/tickets:
 *   get:
 *     summary: Retrieve all tickets (Filtered by role access)
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Tickets retrieved successfully
 */
router.get('/', protect, getAllTickets);

/**
 * @swagger
 * /api/tickets/{id}:
 *   get:
 *     summary: Get specific ticket details by ID
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket details retrieved successfully
 */
router.get('/:id', protect, getTicketById); 

/**
 * @swagger
 * /api/tickets/{id}:
 *   put:
 *     summary: Update ticket status
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ticket status updated successfully
 */
router.put('/:id', protect, authorize('AGENT', 'TECHNICIAN', 'MANAGER'), updateTicket);

/**
 * @swagger
 * /api/tickets/{id}:
 *   delete:
 *     summary: Delete a ticket (Subject to security constraints)
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket deleted successfully
 */
router.delete('/:id', protect, authorize('MANAGER'), deleteTicket);

module.exports = router;