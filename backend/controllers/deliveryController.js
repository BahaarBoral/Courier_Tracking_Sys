const database = require('../config/database');
const oracledb = require('oracledb');

exports.getAgentDeliveries = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const agentId = req.user.employeeId || req.user.accountId;
    const result = await connection.execute(
      `BEGIN :cursor := PKG_DELIVERY.GET_AGENT_DELIVERIES(:p_agent_id); END;`,
      { 
        cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
        p_agent_id: agentId
      }
    );
    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(1000);
    await resultSet.close();
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error:', err);
    const statusCode = err.errorNum === 20001 ? 400 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.assignDelivery = async (req, res) => {
  const { shipmentId, agentId } = req.body;
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN PKG_DELIVERY.ASSIGN_DELIVERY(:p_shipment_id, :p_agent_id, :p_user_id, :p_delivery_id); END;`,
      { 
        p_shipment_id: shipmentId,
        p_agent_id: agentId,
        p_user_id: req.user.accountId,
        p_delivery_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Delivery assigned successfully', deliveryId: result.outBinds.p_delivery_id });
  } catch (err) {
    console.error('Error:', err);
    const statusCode = err.errorNum === 20001 ? 400 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  const { status, location } = req.body;
  let connection;
  try {
    connection = await database.getConnection();
    await connection.execute(
      `BEGIN PKG_DELIVERY.UPDATE_DELIVERY_STATUS(:p_delivery_id, :p_status, :p_location, :p_user_id); END;`,
      { 
        p_delivery_id: req.params.id,
        p_status: status,
        p_location: location || 'In Transit',
        p_user_id: req.user.accountId
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Delivery status updated' });
  } catch (err) {
    console.error('Error:', err);
    const statusCode = err.errorNum === 20001 ? 400 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.completeDelivery = async (req, res) => {
  const { receiverName, receiverSignature } = req.body;
  let connection;
  try {
    connection = await database.getConnection();
    await connection.execute(
      `BEGIN PKG_DELIVERY.MARK_DELIVERED(:p_delivery_id, :p_receiver_name, :p_receiver_signature, :p_user_id); END;`,
      { 
        p_delivery_id: req.params.id,
        p_receiver_name: receiverName || 'Receiver',
        p_receiver_signature: receiverSignature || 'Signed',
        p_user_id: req.user.accountId
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Delivery completed successfully' });
  } catch (err) {
    console.error('Error:', err);
    const statusCode = err.errorNum === 20001 ? 400 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.getAllDeliveries = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_DELIVERY.GET_ALL_DELIVERIES(); END;`,
      { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } }
    );
    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(1000);
    await resultSet.close();
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error:', err);
    const statusCode = err.errorNum === 20001 ? 400 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.getDeliveryByShipment = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_DELIVERY.GET_DELIVERY_BY_SHIPMENT(:p_shipment_id); END;`,
      { 
        cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
        p_shipment_id: req.params.shipmentId
      }
    );
    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(1);
    await resultSet.close();
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error:', err);
    const statusCode = err.errorNum === 20001 ? 400 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};
