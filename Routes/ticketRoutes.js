const express = require('express');
const router = express.Router();
const { 
    createTicket, 
    getAllTickets, 
    updateTicket, 
    deleteTicket,
    getAnalyticsData,
    assignTicket // 👈 ضفنا استدعاء الدالة الجديدة هنا
} = require('../controllers/ticketController');

const { protect, authorize } = require('../middleware/authMiddleware');

// ==========================================
// 🛡️ INPUT VALIDATION MIDDLEWARE
// ==========================================
const validateTicketInput = (req, res, next) => {
    const { title, description, categoryId, locationId } = req.body;
    
    if (!title || !description || !categoryId || !locationId) {
        return res.status(400).json({ 
            success: false, 
            message: 'Please provide all required fields: title, description, categoryId, locationId' 
        });
    }
    next();
};

// ==========================================
// 🔗 TICKET ROUTES
// ==========================================

// 🧠 AI & Analytics Route (Placed before /:id so it doesn't get confused with an ID)
router.get('/analytics', protect, authorize('MANAGER', 'AGENT'), getAnalyticsData);

// 🚀 مسار تحويل التيكت للفني (مسموح للـ AGENT والـ MANAGER بس)
router.put('/:id/assign', protect, authorize('AGENT', 'MANAGER'), assignTicket);

// Standard Routes
// 👈 الميدل وير اتضاف هنا قبل الكنترولر
router.post('/', protect, validateTicketInput, createTicket);
router.get('/', protect, getAllTickets);
router.put('/:id', protect, authorize('AGENT', 'TECHNICIAN', 'MANAGER'), updateTicket);
router.delete('/:id', protect, authorize('MANAGER'), deleteTicket);

module.exports = router;