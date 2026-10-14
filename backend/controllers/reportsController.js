const database = require('../config/database');
const oracledb = require('oracledb');

const executeReportQuery = async (procedureName, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    const result = await connection.execute(
      `BEGIN :cursor := PKG_REPORTS.${procedureName}(); END;`,
      { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } }
    );
    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(1000);
    await resultSet.close();
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(`Error in ${procedureName}:`, err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.getRevenueByMonth = (req, res) => executeReportQuery('GET_REVENUE_BY_MONTH', res);
exports.getShipmentsByStatus = (req, res) => executeReportQuery('GET_SHIPMENTS_BY_STATUS', res);
exports.getTopCustomers = (req, res) => executeReportQuery('GET_TOP_CUSTOMERS', res);
exports.getWarehouseUtilization = (req, res) => executeReportQuery('GET_WAREHOUSE_UTILIZATION_REPORT', res);
exports.getAgentPerformance = (req, res) => executeReportQuery('GET_AGENT_PERFORMANCE_REPORT', res);
exports.getPopularRoutes = (req, res) => executeReportQuery('GET_MOST_USED_ROUTES', res);
exports.getDelayedShipments = (req, res) => executeReportQuery('GET_DELAYED_SHIPMENTS', res);
exports.getDeliveryStats = (req, res) => executeReportQuery('GET_DELIVERY_STATS', res);
