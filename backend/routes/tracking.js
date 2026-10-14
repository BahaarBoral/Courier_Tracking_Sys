const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const auth = require('../middleware/auth');

router.get('/:shipmentId', auth, trackingController.getTrackingHistory);
router.get('/:shipmentId/latest', auth, trackingController.getLatestTracking);
router.get('/:shipmentId/history', auth, trackingController.getTrackingHistory); // Can alias

module.exports = router;
