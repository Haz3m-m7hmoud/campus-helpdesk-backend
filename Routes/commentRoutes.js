const express = require('express');
// mergeParams: true عشان نقدر نقرأ الـ id بتاع التيكت من المسار الأب
const router = express.Router({ mergeParams: true }); 

const { addComment, getTicketComments } = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

// المسارات دي هتبقى مربوطة بـ /api/tickets/:id/comments
router.post('/', protect, addComment);
router.get('/', protect, getTicketComments);

module.exports = router;    