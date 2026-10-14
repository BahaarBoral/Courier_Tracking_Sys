const database = require('../config/database');
const oracledb = require('oracledb');

exports.bookShipment = async (req, res) => {
  let { warehouseId, routeId, weight, deliveryType, parcelType, length, width, height, fragile, paymentMethod } = req.body;
  let connection;
  try {
    connection = await database.getConnection();
    
    // If warehouseId wasn't passed directly, select the first available warehouse
    if (!warehouseId) {
      const whRes = await connection.execute(`SELECT MIN(Warehouse_ID) AS WH_ID FROM WAREHOUSE`);
      if (whRes.rows && whRes.rows[0]) {
        warehouseId = whRes.rows[0].WH_ID;
      }
    }
    
    // Default dimensions if missing
    length = length || 10;
    width = width || 10;
    height = height || 10;
    fragile = fragile === true || fragile === 'Y' ? 'Y' : 'N';
    
    const result = await connection.execute(
      `BEGIN PKG_SHIPMENT.BOOK_SHIPMENT(
        :p_customer_id, :p_warehouse_id, :p_route_id, :p_weight, :p_delivery_type, 
        :p_parcel_type, :p_length, :p_width, :p_height, :p_fragile, :p_payment_method, 
        :p_shipment_id, :p_parcel_id, :p_tracking_id, :p_payment_id
      ); END;`,
      {
        p_customer_id: req.user.customerId,
        p_warehouse_id: warehouseId,
        p_route_id: routeId,
        p_weight: weight,
        p_delivery_type: deliveryType,
        p_parcel_type: parcelType,
        p_length: length,
        p_width: width,
        p_height: height,
        p_fragile: fragile,
        p_payment_method: paymentMethod,
        p_shipment_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        p_parcel_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        p_tracking_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        p_payment_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    await connection.commit();
    
    res.json({ 
      success: true, 
      message: 'Shipment booked successfully',
      data: {
        shipmentId: result.outBinds.p_shipment_id,
        parcelId: result.outBinds.p_parcel_id,
        trackingId: result.outBinds.p_tracking_id,
        paymentId: result.outBinds.p_payment_id
      }
    });
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

exports.getAllShipments = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    let result;
    if (req.query.status) {
      result = await connection.execute(
        `BEGIN :cursor := PKG_SHIPMENT.GET_SHIPMENTS_BY_STATUS(:p_status); END;`,
        { 
          cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
          p_status: req.query.status
        }
      );
    } else {
      result = await connection.execute(
        `BEGIN :cursor := PKG_SHIPMENT.GET_ALL_SHIPMENTS(); END;`,
        { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } }
      );
    }
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

exports.getCustomerShipments = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_SHIPMENT.GET_CUSTOMER_SHIPMENTS(:p_customer_id); END;`,
      { 
        cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
        p_customer_id: req.user.customerId
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

exports.getShipment = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_SHIPMENT.GET_SHIPMENT(:p_shipment_id); END;`,
      { 
        cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
        p_shipment_id: req.params.id
      }
    );
    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(1);
    await resultSet.close();
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
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

exports.updateStatus = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    await connection.execute(
      `BEGIN PKG_SHIPMENT.UPDATE_SHIPMENT_STATUS(:p_shipment_id, :p_new_status, :p_location, :p_remarks, :p_changed_by); END;`,
      { 
        p_shipment_id: req.params.id,
        p_new_status: req.body.status,
        p_location: req.body.location || 'In Transit',
        p_remarks: req.body.remarks || 'Status update',
        p_changed_by: req.user.accountId
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Status updated successfully' });
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

exports.cancelShipment = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    await connection.execute(
      `BEGIN PKG_SHIPMENT.CANCEL_SHIPMENT(:p_shipment_id, :p_customer_id); END;`,
      { 
        p_shipment_id: req.params.id,
        p_customer_id: req.user.customerId
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Shipment cancelled successfully' });
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

exports.getShipmentsByStatus = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_SHIPMENT.GET_SHIPMENTS_BY_STATUS(:p_status); END;`,
      { 
        cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
        p_status: req.params.status
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

exports.getShipmentsByWarehouse = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_SHIPMENT.GET_SHIPMENTS_BY_WAREHOUSE(:p_warehouse_id); END;`,
      { 
        cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
        p_warehouse_id: req.params.id
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
