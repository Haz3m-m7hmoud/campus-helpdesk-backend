const express = require('express');
const router = express.Router();
const { getCategories, getLocations } = require('../controllers/masterController');
const { protect } = require('../middleware/authMiddleware');

router.get('/categories', protect, getCategories);
router.get('/locations', protect, getLocations);

module.exports = router;