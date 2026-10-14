const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipmentController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.post('/', auth, roleCheck('CUSTOMER'), shipmentController.bookShipment);
router.get('/', auth, roleCheck('ADMIN'), shipmentController.getAllShipments);
router.get('/my', auth, roleCheck('CUSTOMER'), shipmentController.getCustomerShipments);
router.get('/:id', auth, shipmentController.getShipment);
router.put('/:id/status', auth, roleCheck('ADMIN', 'DELIVERY_AGENT', 'WAREHOUSE_STAFF'), shipmentController.updateStatus);
router.put('/:id/cancel', auth, roleCheck('CUSTOMER', 'ADMIN'), shipmentController.cancelShipment);
router.get('/status/:status', auth, roleCheck('ADMIN'), shipmentController.getShipmentsByStatus);
router.get('/warehouse/:id', auth, roleCheck('ADMIN', 'WAREHOUSE_STAFF'), shipmentController.getShipmentsByWarehouse);

module.exports = router;
