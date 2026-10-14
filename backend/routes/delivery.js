const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/my', auth, roleCheck('DELIVERY_AGENT'), deliveryController.getAgentDeliveries);
router.post('/assign', auth, roleCheck('ADMIN'), deliveryController.assignDelivery);
router.put('/:id/status', auth, roleCheck('DELIVERY_AGENT'), deliveryController.updateDeliveryStatus);
router.put('/:id/complete', auth, roleCheck('DELIVERY_AGENT'), deliveryController.completeDelivery);
router.get('/', auth, roleCheck('ADMIN'), deliveryController.getAllDeliveries);
router.get('/shipment/:shipmentId', auth, deliveryController.getDeliveryByShipment);

module.exports = router;
