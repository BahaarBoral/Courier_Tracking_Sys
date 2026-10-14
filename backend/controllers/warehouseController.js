const database = require('../config/database');
const oracledb = require('oracledb');

exports.getAllWarehouses = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_WAREHOUSE.GET_ALL_WAREHOUSES(); END;`,
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

exports.getWarehouseShipments = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_WAREHOUSE.GET_WAREHOUSE_SHIPMENTS(:p_warehouse_id); END;`,
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

exports.receiveShipment = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    await connection.execute(
      `BEGIN PKG_WAREHOUSE.RECEIVE_SHIPMENT(:p_shipment_id, :p_warehouse_id, :p_staff_id); END;`,
      { 
        p_shipment_id: req.params.shipmentId,
        p_warehouse_id: req.body.warehouseId,
        p_staff_id: req.user.accountId
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Shipment received at warehouse' });
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

exports.dispatchShipment = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    await connection.execute(
      `BEGIN PKG_WAREHOUSE.DISPATCH_SHIPMENT(:p_shipment_id, :p_user_id); END;`,
      { 
        p_shipment_id: req.params.shipmentId,
        p_user_id: req.user.accountId
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Shipment dispatched from warehouse' });
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

exports.getCapacity = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_WAREHOUSE.GET_WAREHOUSE_CAPACITY(:p_warehouse_id); END;`,
      { 
        cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
        p_warehouse_id: req.params.id
      }
    );
    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(1);
    await resultSet.close();
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

exports.addWarehouse = async (req, res) => {
  const name = req.body.name || req.body.warehouseName || req.body.locationName || req.body.warehouseCode;
  const location = req.body.location || req.body.address || req.body.locationName || 'General Facility';
  const capacity = parseInt(req.body.capacity) || 100;
  const contact = req.body.contact || req.body.contactNo || '022-12345678';
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN PKG_WAREHOUSE.ADD_WAREHOUSE(:p_name, :p_location, :p_capacity, :p_contact, :p_warehouse_id); END;`,
      { 
        p_name: name, 
        p_location: location, 
        p_capacity: capacity, 
        p_contact: contact,
        p_warehouse_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Warehouse added successfully', warehouseId: result.outBinds.p_warehouse_id });
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

exports.updateWarehouse = async (req, res) => {
  const { name, location, capacity, contact } = req.body;
  let connection;
  try {
    connection = await database.getConnection();
    await connection.execute(
      `BEGIN PKG_WAREHOUSE.UPDATE_WAREHOUSE(:p_warehouse_id, :p_name, :p_location, :p_capacity, :p_contact); END;`,
      { 
        p_warehouse_id: req.params.id, 
        p_name: name, 
        p_location: location, 
        p_capacity: capacity,
        p_contact: contact || 'N/A'
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Warehouse updated successfully' });
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
