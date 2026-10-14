const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth, roleCheck('ADMIN'));

router.get('/dashboard', adminController.getDashboardStats);
router.get('/stats', adminController.getDashboardStats);
router.get('/payments', require('../controllers/paymentController').getAllPayments);
router.get('/employees', adminController.getEmployees);
router.post('/employees', adminController.addEmployee);
router.put('/employees/:id', adminController.updateEmployee);
router.delete('/employees/:id', adminController.deleteEmployee);
router.get('/routes', adminController.getRoutes);
router.post('/routes', adminController.addRoute);
router.put('/routes/:id', adminController.updateRoute);
router.delete('/routes/:id', adminController.deleteRoute);
router.get('/vehicles', adminController.getVehicles);
router.post('/vehicles', adminController.addVehicle);
router.put('/vehicles/:id', adminController.updateVehicle);
router.get('/audit', adminController.getAuditLog);

module.exports = router;
