const express = require('express');
const router = express.Router();
const database = require('../config/database');
const oracledb = require('oracledb');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth, roleCheck('DELIVERY_AGENT'));

// GET /api/agent/me/stats
router.get('/me/stats', async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const agentId = req.user.employeeId || req.user.accountId;
    const result = await connection.execute(
      `SELECT 
         NVL(SUM(CASE WHEN Delivery_Status IN ('ASSIGNED', 'PENDING', 'PICKED_UP') THEN 1 ELSE 0 END), 0) AS ASSIGNED,
         NVL(SUM(CASE WHEN Delivery_Status IN ('IN_TRANSIT', 'OUT_FOR_DELIVERY') THEN 1 ELSE 0 END), 0) AS IN_TRANSIT,
         NVL(SUM(CASE WHEN Delivery_Status = 'DELIVERED' THEN 1 ELSE 0 END), 0) AS DELIVERED_TODAY
       FROM DELIVERY WHERE Agent_ID = :p_agent_id`,
      { p_agent_id: agentId }
    );
    const row = (result.rows && result.rows[0]) || {};
    res.json({
      success: true,
      assigned: row.ASSIGNED || 0,
      inTransit: row.IN_TRANSIT || 0,
      deliveredToday: row.DELIVERED_TODAY || 0
    });
  } catch (err) {
    console.error('Agent stats error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e); }
    }
  }
});

// GET /api/agent/me/deliveries
router.get('/me/deliveries', async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const agentId = req.user.employeeId || req.user.accountId;
    let sql = `
      SELECT d.Delivery_ID as "id", d.Delivery_ID as "DELIVERY_ID",
             d.Shipment_ID as "trackingNumber", d.Shipment_ID as "SHIPMENT_ID",
             d.Delivery_Status as "status", d.Delivery_Status as "DELIVERY_STATUS",
             s.Current_Status as "shipmentStatus", s.Delivery_Type as "deliveryType", s.Weight as "weight",
             NVL(c.Name, 'Customer') as "receiverName",
             NVL(c.Phone, '-') as "receiverPhone",
             NVL(c.Address, NVL(r.Destination, 'Local Destination')) as "receiverAddress",
             r.Destination as "destination"
      FROM DELIVERY d
      JOIN SHIPMENT s ON d.Shipment_ID = s.Shipment_ID
      LEFT JOIN CUSTOMER c ON s.Customer_ID = c.Customer_ID
      LEFT JOIN ROUTE r ON s.Route_ID = r.Route_ID
      WHERE d.Agent_ID = :p_agent_id
    `;
    const binds = { p_agent_id: agentId };
    if (req.query.active === 'true') {
      sql += ` AND d.Delivery_Status != 'DELIVERED'`;
    } else if (req.query.status) {
      sql += ` AND d.Delivery_Status = :p_status`;
      binds.p_status = req.query.status;
    }
    sql += ` ORDER BY d.Delivery_ID DESC`;

    const result = await connection.execute(sql, binds);
    res.json({ success: true, data: result.rows || [] });
  } catch (err) {
    console.error('Agent deliveries error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e); }
    }
  }
});

// PUT /api/agent/deliveries/:id/status
router.put('/deliveries/:id/status', async (req, res) => {
  let connection;
  const { status, remarks, location } = req.body;
  const deliveryId = req.params.id;

  try {
    connection = await database.getConnection();
    let actualDeliveryId = deliveryId;
    const findDeliv = await connection.execute(
      `SELECT Delivery_ID FROM DELIVERY WHERE Delivery_ID = :p_id OR Shipment_ID = :p_id`,
      { p_id: deliveryId }
    );
    if (findDeliv.rows && findDeliv.rows.length > 0) {
      actualDeliveryId = findDeliv.rows[0].DELIVERY_ID;
    }

    if (status === 'DELIVERED') {
      const receiverName = remarks ? remarks.replace(/^Delivered to:\s*/i, '').trim() : 'Customer';
      await connection.execute(
        `BEGIN PKG_DELIVERY.MARK_DELIVERED(:p_delivery_id, :p_receiver_name, :p_receiver_signature, :p_user_id); END;`,
        {
          p_delivery_id: actualDeliveryId,
          p_receiver_name: receiverName || 'Customer',
          p_receiver_signature: 'Verified Signature',
          p_user_id: req.user.accountId
        }
      );
    } else {
      await connection.execute(
        `BEGIN PKG_DELIVERY.UPDATE_DELIVERY_STATUS(:p_delivery_id, :p_status, :p_location, :p_user_id); END;`,
        {
          p_delivery_id: actualDeliveryId,
          p_status: status,
          p_location: location || 'Out for Delivery',
          p_user_id: req.user.accountId
        }
      );
    }
    await connection.commit();
    res.json({ success: true, message: 'Delivery status updated' });
  } catch (err) {
    console.error('Agent update status error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e); }
    }
  }
});

module.exports = router;
