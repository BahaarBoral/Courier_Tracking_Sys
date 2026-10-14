const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth, roleCheck('ADMIN'));

router.get('/revenue', reportsController.getRevenueByMonth);
router.get('/shipment-status', reportsController.getShipmentsByStatus);
router.get('/top-customers', reportsController.getTopCustomers);
router.get('/warehouse-utilization', reportsController.getWarehouseUtilization);
router.get('/agent-performance', reportsController.getAgentPerformance);
router.get('/popular-routes', reportsController.getPopularRoutes);
router.get('/delayed-shipments', reportsController.getDelayedShipments);
router.get('/delivery-stats', reportsController.getDeliveryStats);

module.exports = router;
