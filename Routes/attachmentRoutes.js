const express = require('express');
const router = express.Router({ mergeParams: true }); // Required to access the ticket ID from the parent route
const { uploadAttachment, getTicketAttachments } = require('../controllers/attachmentController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Protect all attachment routes
router.use(protect);

/**
 * @swagger
 * /api/tickets/{id}/attachments:
 *   post:
 *     summary: Upload a file attachment to a ticket
 *     tags: [Attachments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Ticket ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               is_private:
 *                 type: boolean
 *                 description: True if the file should be hidden from reporters
 *     responses:
 *       201:
 *         description: File uploaded successfully
 */
router.post('/', upload.single('file'), uploadAttachment);

/**
 * @swagger
 * /api/tickets/{id}/attachments:
 *   get:
 *     summary: Get all attachments for a ticket
 *     tags: [Attachments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Ticket ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attachments retrieved successfully
 */
router.get('/', getTicketAttachments);

module.exports = router;