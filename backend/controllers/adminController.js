const database = require('../config/database');
const oracledb = require('oracledb');
const bcrypt = require('bcryptjs');

exports.getDashboardStats = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_ADMIN.GET_DASHBOARD_STATS(); END;`,
      { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } }
    );
    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(1);
    await resultSet.close();

    const row = rows[0] || {};
    
    // Status distribution for doughnut chart
    let statusDistribution = { BOOKED: 0, IN_TRANSIT: 0, DELIVERED: 0, OUT_FOR_DELIVERY: 0, CANCELLED: 0 };
    try {
      const distRes = await connection.execute(`SELECT Current_Status, COUNT(*) AS CNT FROM SHIPMENT GROUP BY Current_Status`);
      if (distRes.rows) {
        distRes.rows.forEach(r => {
          statusDistribution[r.CURRENT_STATUS] = r.CNT;
        });
      }
    } catch (e) {
      console.error('Failed to get status distribution:', e);
    }

    res.json({
      success: true,
      data: row,
      totalCustomers: row.TOTAL_CUSTOMERS || 0,
      totalShipments: row.TOTAL_SHIPMENTS || 0,
      activeShipments: row.ACTIVE_SHIPMENTS || 0,
      pendingDeliveries: row.PENDING_DELIVERIES || 0,
      totalRevenue: row.TOTAL_REVENUE || 0,
      activeEmployees: row.TOTAL_EMPLOYEES || 0,
      totalEmployees: row.TOTAL_EMPLOYEES || 0,
      totalWarehouses: row.TOTAL_WAREHOUSES || 0,
      statusDistribution
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.getEmployees = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_ADMIN.GET_ALL_EMPLOYEES(); END;`,
      { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } }
    );
    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(1000);
    await resultSet.close();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.addEmployee = async (req, res) => {
  const { name, phone, email, salary, type, password, role, warehouseId, shift, vehicleId, license, experience } = req.body;
  let connection;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN PKG_ADMIN.ADD_EMPLOYEE(:p_name, :p_phone, :p_email, :p_salary, :p_type, :p_password, :p_role, :p_warehouse_id, :p_shift, :p_vehicle_id, :p_license, :p_experience, :p_employee_id); END;`,
      { 
        p_name: name,
        p_phone: phone, 
        p_email: email, 
        p_salary: salary || 30000,
        p_type: type || 'ADMIN',
        p_password: hashedPassword,
        p_role: role || null, 
        p_warehouse_id: warehouseId || null, 
        p_shift: shift || null,
        p_vehicle_id: vehicleId || null,
        p_license: license || null,
        p_experience: experience || 0,
        p_employee_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Employee added successfully', employeeId: result.outBinds.p_employee_id });
  } catch (err) {
    console.error(err);
    const statusCode = err.errorNum === 20001 ? 400 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.updateEmployee = async (req, res) => {
  const { name, phone, salary } = req.body;
  let connection;
  try {
    connection = await database.getConnection();
    await connection.execute(
      `BEGIN PKG_ADMIN.UPDATE_EMPLOYEE(:p_employee_id, :p_name, :p_phone, :p_salary); END;`,
      { 
        p_employee_id: req.params.id, 
        p_name: name, 
        p_phone: phone, 
        p_salary: salary 
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Employee updated successfully' });
  } catch (err) {
    const statusCode = err.errorNum === 20001 ? 400 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.deleteEmployee = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    await connection.execute(
      `BEGIN PKG_ADMIN.DELETE_EMPLOYEE(:p_employee_id, :p_user_id); END;`,
      { 
        p_employee_id: req.params.id,
        p_user_id: req.user.accountId
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (err) {
    const statusCode = err.errorNum === 20001 ? 400 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.getRoutes = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_ADMIN.GET_ALL_ROUTES(); END;`,
      { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } }
    );
    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(1000);
    await resultSet.close();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.addRoute = async (req, res) => {
  const { source, destination, distance, estimatedTime } = req.body;
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN PKG_ADMIN.ADD_ROUTE(:p_source, :p_destination, :p_distance, :p_time, :p_route_id); END;`,
      { 
        p_source: source, 
        p_destination: destination, 
        p_distance: distance, 
        p_time: estimatedTime,
        p_route_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Route added successfully', routeId: result.outBinds.p_route_id });
  } catch (err) {
    const statusCode = err.errorNum === 20001 ? 400 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.updateRoute = async (req, res) => {
  const { source, destination, distance, estimatedTime } = req.body;
  let connection;
  try {
    connection = await database.getConnection();
    await connection.execute(
      `BEGIN PKG_ADMIN.UPDATE_ROUTE(:p_route_id, :p_source, :p_destination, :p_distance, :p_time); END;`,
      { 
        p_route_id: req.params.id, 
        p_source: source, 
        p_destination: destination, 
        p_distance: distance, 
        p_time: estimatedTime 
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Route updated successfully' });
  } catch (err) {
    const statusCode = err.errorNum === 20001 ? 400 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.deleteRoute = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    await connection.execute(
      `BEGIN PKG_ADMIN.DELETE_ROUTE(:p_route_id); END;`,
      { p_route_id: req.params.id }
    );
    await connection.commit();
    res.json({ success: true, message: 'Route deleted successfully' });
  } catch (err) {
    const statusCode = err.errorNum === 20001 ? 400 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.getVehicles = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_ADMIN.GET_ALL_VEHICLES(); END;`,
      { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } }
    );
    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(1000);
    await resultSet.close();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.addVehicle = async (req, res) => {
  const { number, type, capacity } = req.body;
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN PKG_ADMIN.ADD_VEHICLE(:p_number, :p_type, :p_capacity, :p_vehicle_id); END;`,
      { 
        p_number: number, 
        p_type: type, 
        p_capacity: capacity, 
        p_vehicle_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Vehicle added successfully', vehicleId: result.outBinds.p_vehicle_id });
  } catch (err) {
    const statusCode = err.errorNum === 20001 ? 400 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.updateVehicle = async (req, res) => {
  const { number, type, capacity, availability } = req.body;
  let connection;
  try {
    connection = await database.getConnection();
    await connection.execute(
      `BEGIN PKG_ADMIN.UPDATE_VEHICLE(:p_vehicle_id, :p_number, :p_type, :p_capacity, :p_availability); END;`,
      { 
        p_vehicle_id: req.params.id, 
        p_number: number, 
        p_type: type, 
        p_capacity: capacity, 
        p_availability: availability || 'AVAILABLE' 
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Vehicle updated successfully' });
  } catch (err) {
    const statusCode = err.errorNum === 20001 ? 400 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.getAuditLog = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_ADMIN.GET_AUDIT_LOG(); END;`,
      { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } }
    );
    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(1000);
    await resultSet.close();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};
