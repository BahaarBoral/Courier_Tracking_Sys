const express = require('express');
const router = express.Router();
const database = require('../config/database');
const oracledb = require('oracledb');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth, roleCheck('WAREHOUSE_STAFF', 'ADMIN'));

// Helper to get staff's warehouse info
async function getStaffWarehouse(connection, empId) {
  let whRes = await connection.execute(
    `SELECT ws.Warehouse_ID, w.Warehouse_Name, w.Location, w.Capacity 
     FROM WAREHOUSE_STAFF ws 
     JOIN WAREHOUSE w ON ws.Warehouse_ID = w.Warehouse_ID 
     WHERE ws.Employee_ID = :empId`,
    { empId: empId || 0 }
  );
  if (whRes.rows && whRes.rows.length > 0) {
    return whRes.rows[0];
  }
  // Fallback to first warehouse in system
  whRes = await connection.execute(
    `SELECT Warehouse_ID, Warehouse_Name, Location, Capacity FROM WAREHOUSE WHERE ROWNUM = 1`
  );
  return (whRes.rows && whRes.rows[0]) || { WAREHOUSE_ID: 3000, WAREHOUSE_NAME: 'Main Hub', LOCATION: 'Central', CAPACITY: 100 };
}

// GET /api/warehouse/me/stats
router.get('/me/stats', async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const wh = await getStaffWarehouse(connection, req.user.employeeId);
    const whId = wh.WAREHOUSE_ID;

    // Current inventory: WAREHOUSE_RECEIVED
    const invRes = await connection.execute(
      `SELECT COUNT(*) AS CNT FROM SHIPMENT WHERE Warehouse_ID = :whId AND Current_Status = 'WAREHOUSE_RECEIVED'`,
      { whId }
    );
    // Incoming expected: BOOKED
    const inRes = await connection.execute(
      `SELECT COUNT(*) AS CNT FROM SHIPMENT WHERE Current_Status = 'BOOKED'`
    );
    // Ready for dispatch: WAREHOUSE_RECEIVED
    const dispRes = await connection.execute(
      `SELECT COUNT(*) AS CNT FROM SHIPMENT WHERE Warehouse_ID = :whId AND Current_Status = 'WAREHOUSE_RECEIVED'`,
      { whId }
    );

    const currentInventory = invRes.rows[0].CNT;
    const expectedIncoming = inRes.rows[0].CNT;
    const readyForDispatch = dispRes.rows[0].CNT;

    res.json({
      success: true,
      warehouse: {
        id: wh.WAREHOUSE_ID,
        warehouseCode: `WH-${wh.WAREHOUSE_ID}`,
        locationName: `${wh.WAREHOUSE_NAME} (${wh.LOCATION})`,
        capacity: wh.CAPACITY
      },
      currentInventory,
      expectedIncoming,
      readyForDispatch
    });
  } catch (err) {
    console.error('Warehouse stats error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e); }
    }
  }
});

// GET /api/warehouse/me/incoming
router.get('/me/incoming', async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `SELECT s.Shipment_ID as "id", s.Shipment_ID as "SHIPMENT_ID",
              s.Shipment_ID as "trackingNumber",
              s.Booking_Date as "createdAt",
              s.Current_Status as "status",
              c.Address as "senderAddress",
              c.Name as "customerName"
       FROM SHIPMENT s
       JOIN CUSTOMER c ON s.Customer_ID = c.Customer_ID
       WHERE s.Current_Status = 'BOOKED'
       ORDER BY s.Shipment_ID DESC`
    );
    res.json({ success: true, data: result.rows || [] });
  } catch (err) {
    console.error('Warehouse incoming error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e); }
    }
  }
});

// GET /api/warehouse/me/dispatch
router.get('/me/dispatch', async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `SELECT s.Shipment_ID as "id", s.Shipment_ID as "SHIPMENT_ID",
              s.Shipment_ID as "trackingNumber",
              s.Booking_Date as "updatedAt",
              s.Current_Status as "status",
              c.Address as "receiverAddress",
              r.Destination as "destination"
       FROM SHIPMENT s
       JOIN CUSTOMER c ON s.Customer_ID = c.Customer_ID
       LEFT JOIN ROUTE r ON s.Route_ID = r.Route_ID
       WHERE s.Current_Status = 'WAREHOUSE_RECEIVED'
       ORDER BY s.Shipment_ID DESC`
    );
    res.json({ success: true, data: result.rows || [] });
  } catch (err) {
    console.error('Warehouse dispatch error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e); }
    }
  }
});

// PUT /api/warehouse/shipments/:id/receive
router.put('/shipments/:id/receive', async (req, res) => {
  let connection;
  const shipmentId = req.params.id;
  try {
    connection = await database.getConnection();
    const wh = await getStaffWarehouse(connection, req.user.employeeId);
    const whId = wh.WAREHOUSE_ID;

    await connection.execute(
      `BEGIN PKG_WAREHOUSE.RECEIVE_SHIPMENT(:p_shipment_id, :p_warehouse_id, :p_staff_id); END;`,
      {
        p_shipment_id: shipmentId,
        p_warehouse_id: whId,
        p_staff_id: req.user.accountId
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Shipment received at warehouse' });
  } catch (err) {
    console.error('Warehouse receive error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e); }
    }
  }
});

// PUT /api/warehouse/shipments/:id/dispatch
router.put('/shipments/:id/dispatch', async (req, res) => {
  let connection;
  const shipmentId = req.params.id;
  try {
    connection = await database.getConnection();
    await connection.execute(
      `BEGIN PKG_WAREHOUSE.DISPATCH_SHIPMENT(:p_shipment_id, :p_user_id); END;`,
      {
        p_shipment_id: shipmentId,
        p_user_id: req.user.accountId
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Shipment dispatched from warehouse' });
  } catch (err) {
    console.error('Warehouse dispatch error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e); }
    }
  }
});

module.exports = router;
