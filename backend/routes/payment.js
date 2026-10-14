const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/shipment/:shipmentId', auth, paymentController.getPaymentForShipment);
router.put('/:id/process', auth, roleCheck('CUSTOMER'), paymentController.processPayment);
router.get('/my', auth, roleCheck('CUSTOMER'), paymentController.getCustomerPayments);
router.get('/', auth, roleCheck('ADMIN'), paymentController.getAllPayments);

module.exports = router;
