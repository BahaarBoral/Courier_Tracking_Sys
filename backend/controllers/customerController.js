const database = require('../config/database');
const oracledb = require('oracledb');

exports.getProfile = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    
    const customerId = req.user && req.user.customerId;
    if (!customerId) {
      return res.json({ 
        success: true, 
        data: { 
          NAME: req.user.name || '', 
          EMAIL: req.user.email || '', 
          PHONE: '', 
          ADDRESS: '' 
        } 
      });
    }

    const result = await connection.execute(
      `BEGIN :cursor := PKG_CUSTOMER.GET_CUSTOMER_PROFILE(:p_customer_id); END;`,
      {
        cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
        p_customer_id: customerId
      }
    );
    
    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(1);
    await resultSet.close();
    
    if (rows.length === 0) {
      return res.json({ 
        success: true, 
        data: { 
          NAME: req.user.name || '', 
          EMAIL: req.user.email || '', 
          PHONE: '', 
          ADDRESS: '' 
        } 
      });
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

exports.updateProfile = async (req, res) => {
  const { name, phone, address } = req.body;
  let connection;
  try {
    connection = await database.getConnection();
    
    await connection.execute(
      `BEGIN PKG_CUSTOMER.UPDATE_CUSTOMER(:p_customer_id, :p_name, :p_phone, :p_address); END;`,
      {
        p_customer_id: req.user.customerId,
        p_name: name,
        p_phone: phone,
        p_address: address
      }
    );
    await connection.commit();
    
    res.json({ success: true, message: 'Profile updated successfully' });
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

exports.getAllCustomers = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    
    const result = await connection.execute(
      `BEGIN :cursor := PKG_CUSTOMER.GET_ALL_CUSTOMERS(); END;`,
      {
        cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR }
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

exports.getCustomerStats = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const customerId = req.user.customerId;
    
    // Call Oracle function FN_GET_CUSTOMER_SHIPMENT_COUNT
    const countResult = await connection.execute(
      `SELECT FN_GET_CUSTOMER_SHIPMENT_COUNT(:p_cust_id) AS TOTAL FROM DUAL`,
      { p_cust_id: customerId }
    );
    const totalShipments = countResult.rows && countResult.rows[0] ? countResult.rows[0].TOTAL : 0;
    
    // Query active and delivered breakdown
    const breakdown = await connection.execute(
      `SELECT 
         COUNT(CASE WHEN Current_Status IN ('BOOKED','WAREHOUSE_RECEIVED','IN_TRANSIT','OUT_FOR_DELIVERY') THEN 1 END) AS ACTIVE,
         COUNT(CASE WHEN Current_Status = 'DELIVERED' THEN 1 END) AS DELIVERED
       FROM SHIPMENT WHERE Customer_ID = :p_cust_id`,
      { p_cust_id: customerId }
    );
    const active = breakdown.rows && breakdown.rows[0] ? breakdown.rows[0].ACTIVE : 0;
    const delivered = breakdown.rows && breakdown.rows[0] ? breakdown.rows[0].DELIVERED : 0;
    
    // Query pending payments
    const payments = await connection.execute(
      `SELECT COUNT(*) AS PENDING FROM PAYMENT p JOIN SHIPMENT s ON p.Shipment_ID = s.Shipment_ID
       WHERE s.Customer_ID = :p_cust_id AND p.Payment_Status = 'PENDING'`,
      { p_cust_id: customerId }
    );
    const pendingPayments = payments.rows && payments.rows[0] ? payments.rows[0].PENDING : 0;
    
    res.json({
      success: true,
      totalShipments,
      activeShipments: active,
      deliveredShipments: delivered,
      pendingPayments
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) {}
    }
  }
};
