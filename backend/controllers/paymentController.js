const database = require('../config/database');
const oracledb = require('oracledb');

exports.getPaymentForShipment = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_PAYMENT.GET_PAYMENT_BY_SHIPMENT(:p_shipment_id); END;`,
      { 
        cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
        p_shipment_id: req.params.shipmentId
      }
    );
    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(1);
    await resultSet.close();
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
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

exports.processPayment = async (req, res) => {
  const { transactionId } = req.body;
  let connection;
  try {
    connection = await database.getConnection();
    const userId = (req.user && req.user.accountId) || 0;
    await connection.execute(
      `BEGIN PKG_PAYMENT.PROCESS_PAYMENT(:p_payment_id, :p_user_id); END;`,
      { 
        p_payment_id: parseInt(req.params.id),
        p_user_id: userId
      }
    );
    await connection.commit();
    res.json({ success: true, message: 'Payment processed successfully' });
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

exports.getCustomerPayments = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_PAYMENT.GET_CUSTOMER_PAYMENTS(:p_customer_id); END;`,
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

exports.getAllPayments = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_PAYMENT.GET_ALL_PAYMENTS(); END;`,
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
