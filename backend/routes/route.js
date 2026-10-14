const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Routes list is public/authenticated for booking dropdown
router.get('/', adminController.getRoutes);

module.exports = router;
