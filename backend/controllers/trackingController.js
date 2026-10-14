const database = require('../config/database');
const oracledb = require('oracledb');

exports.getTrackingHistory = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_TRACKING.GET_TRACKING_HISTORY(:p_shipment_id); END;`,
      { 
        cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
        p_shipment_id: req.params.shipmentId
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

exports.getLatestTracking = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_TRACKING.GET_LATEST_TRACKING(:p_shipment_id); END;`,
      { 
        cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
        p_shipment_id: req.params.shipmentId
      }
    );
    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(1);
    await resultSet.close();
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No tracking information found' });
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
