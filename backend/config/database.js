const oracledb = require('oracledb');

// Set result format to object for easier handling
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = false; // Let PL/SQL handle commits

async function initialize() {
  const pool = await oracledb.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
    poolMin: 0,        // Don't create connections upfront (lazy)
    poolMax: 10,
    poolIncrement: 1,
  });

  // Test the connection eagerly so we know right away if Oracle is up
  let testConn;
  try {
    testConn = await pool.getConnection();
    await testConn.execute('SELECT 1 FROM DUAL');
    global.oracleConnected = true;
    console.log('✅ Oracle test query (SELECT 1 FROM DUAL) succeeded');
  } catch (err) {
    global.oracleConnected = false;
    throw err; // Let server.js handle reporting
  } finally {
    if (testConn) {
      try { await testConn.close(); } catch (e) {}
    }
  }
  return pool;
}

async function close() {
  try {
    const pool = oracledb.getPool();
    await pool.close(10);
    console.log('Oracle database pool closed');
  } catch (err) {
    console.error('Error closing Oracle database pool', err);
  }
}

async function getConnection() {
  if (!global.oracleConnected) {
    throw new Error(
      'Oracle database is not running. ' +
      'Start Oracle XE or Docker Oracle container first. ' +
      'Current connection string: ' + (process.env.DB_CONNECT_STRING || 'not set')
    );
  }
  const pool = oracledb.getPool();
  return await pool.getConnection();
}

module.exports = { initialize, close, getConnection };
