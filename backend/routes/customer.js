const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/profile', auth, roleCheck('CUSTOMER'), customerController.getProfile);
router.put('/profile', auth, roleCheck('CUSTOMER'), customerController.updateProfile);

// Aliases for /me/profile requested by customer dashboard
router.get('/me/profile', auth, roleCheck('CUSTOMER'), customerController.getProfile);
router.put('/me/profile', auth, roleCheck('CUSTOMER'), customerController.updateProfile);
router.get('/me', auth, roleCheck('CUSTOMER'), customerController.getProfile);
router.get('/me/stats', auth, roleCheck('CUSTOMER'), customerController.getCustomerStats);
router.get('/me/shipments', auth, roleCheck('CUSTOMER'), require('../controllers/shipmentController').getCustomerShipments);
router.get('/me/payments', auth, roleCheck('CUSTOMER'), require('../controllers/paymentController').getCustomerPayments);

// Delete own account (CUSTOMER)
router.delete('/me/account', auth, roleCheck('CUSTOMER'), async (req, res) => {
  const database = require('../config/database');
  const oracledb = require('oracledb');
  let connection;
  try {
    connection = await database.getConnection();
    await connection.execute(
      `BEGIN PKG_AUTH.DELETE_ACCOUNT(:p_account_id); END;`,
      { p_account_id: req.user.accountId }
    );
    await connection.commit();
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) { try { await connection.close(); } catch (e) {} }
  }
});

router.get('/', auth, roleCheck('ADMIN'), customerController.getAllCustomers);

module.exports = router;

