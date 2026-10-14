const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth, roleCheck('ADMIN'));

router.get('/', adminController.getEmployees);
router.post('/', adminController.addEmployee);
router.put('/:id', adminController.updateEmployee);
router.delete('/:id', adminController.deleteEmployee);

module.exports = router;
