const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/', warehouseController.getAllWarehouses); // Public or auth? Assuming auth not strictly needed for list, but let's leave it open or add auth if requested. Prompt didn't specify.
router.get('/:id/shipments', auth, roleCheck('WAREHOUSE_STAFF', 'ADMIN'), warehouseController.getWarehouseShipments);
router.put('/receive/:shipmentId', auth, roleCheck('WAREHOUSE_STAFF'), warehouseController.receiveShipment);
router.put('/dispatch/:shipmentId', auth, roleCheck('WAREHOUSE_STAFF'), warehouseController.dispatchShipment);
router.get('/:id/capacity', auth, warehouseController.getCapacity);
router.post('/', auth, roleCheck('ADMIN'), warehouseController.addWarehouse);
router.put('/:id', auth, roleCheck('ADMIN'), warehouseController.updateWarehouse);

module.exports = router;
