const fs = require('fs');
const path = require('path');
const database = require('../config/database');

const OUTPUT_FILE = path.join(__dirname, '../../live_database_records.txt');

let syncTimeout = null;
let isSyncing = false;

function formatTable(headers, rows) {
  if (!rows || rows.length === 0) {
    return '  (No records found)\n';
  }
  
  // Calculate max width for each column
  const colWidths = headers.map(h => h.label.length);
  rows.forEach(r => {
    headers.forEach((h, i) => {
      const val = String(r[h.key] !== undefined && r[h.key] !== null ? r[h.key] : '-');
      if (val.length > colWidths[i]) {
        colWidths[i] = Math.min(val.length, 35); // cap at 35 chars
      }
    });
  });

  // Header row
  let headerLine = headers.map((h, i) => h.label.padEnd(colWidths[i])).join(' | ');
  let dividerLine = colWidths.map(w => '-'.repeat(w)).join('-+-');

  let tableStr = headerLine + '\n' + dividerLine + '\n';
  rows.forEach(r => {
    let rowLine = headers.map((h, i) => {
      let val = String(r[h.key] !== undefined && r[h.key] !== null ? r[h.key] : '-');
      if (val.length > colWidths[i]) {
        val = val.substring(0, colWidths[i] - 3) + '...';
      }
      return val.padEnd(colWidths[i]);
    }).join(' | ');
    tableStr += rowLine + '\n';
  });

  return tableStr;
}

async function exportLiveDatabase() {
  if (isSyncing) return;
  if (!global.oracleConnected) return;

  isSyncing = true;
  let connection;
  try {
    connection = await database.getConnection();

    // 1. Routes
    const resRoutes = await connection.execute(
      `SELECT Route_ID, Source, Destination, Distance, Estimated_Time FROM ROUTE ORDER BY Route_ID DESC`
    );

    // 2. Warehouses
    const resWarehouses = await connection.execute(
      `SELECT Warehouse_ID, Warehouse_Name, Location, Capacity, Contact_No FROM WAREHOUSE ORDER BY Warehouse_ID DESC`
    );

    // 3. Shipments
    const resShipments = await connection.execute(
      `SELECT Shipment_ID, Customer_ID, Current_Status, Delivery_Type, Weight, Route_ID, Warehouse_ID, Agent_ID, TO_CHAR(Booking_Date, 'YYYY-MM-DD HH24:MI') AS BOOKING_DATE FROM SHIPMENT ORDER BY Shipment_ID DESC`
    );

    // 4. Customers
    const resCustomers = await connection.execute(
      `SELECT Customer_ID, Name, Email, Phone, Address FROM CUSTOMER ORDER BY Customer_ID DESC`
    );

    // 5. Payments
    const resPayments = await connection.execute(
      `SELECT Payment_ID, Shipment_ID, Amount, Payment_Method, Payment_Status, TO_CHAR(Payment_Date, 'YYYY-MM-DD HH24:MI') AS PAYMENT_DATE FROM PAYMENT ORDER BY Payment_ID DESC`
    );

    // 6. Deliveries
    const resDeliveries = await connection.execute(
      `SELECT Delivery_ID, Shipment_ID, Agent_ID, Delivery_Status, Receiver_Name FROM DELIVERY ORDER BY Delivery_ID DESC`
    );

    // 7. Recent Audit Log (Last 10)
    const resAudit = await connection.execute(
      `SELECT Audit_ID, Action, Table_Name, Record_ID, TO_CHAR(Action_Time, 'YYYY-MM-DD HH24:MI:SS') AS ACTION_TIME, Description FROM AUDIT_LOG ORDER BY Audit_ID DESC FETCH FIRST 10 ROWS ONLY`
    );

    const now = new Date();
    const timestampStr = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    let doc = '';
    doc += '========================================================================================\n';
    doc += '       LOGITRACK LIVE ORACLE DATABASE MIRROR (AUTOMATICALLY UPDATING IN REAL-TIME)       \n';
    doc += '========================================================================================\n';
    doc += `[LIVE REFRESH TIMESTAMP]: ${timestampStr} (IST)\n`;
    doc += `[ORACLE INSTANCE]       : Oracle Database 23c Free | Container: oracle-free | PDB: FREEPDB1\n`;
    doc += `[ACTIVE SCHEMA]         : courier_admin (Tablespace: users01.dbf)\n`;
    doc += '----------------------------------------------------------------------------------------\n';
    doc += `SUMMARY COUNTS:\n`;
    doc += ` - Shipments    : ${resShipments.rows.length}\n`;
    doc += ` - Routes       : ${resRoutes.rows.length}\n`;
    doc += ` - Warehouses   : ${resWarehouses.rows.length}\n`;
    doc += ` - Customers    : ${resCustomers.rows.length}\n`;
    doc += ` - Payments     : ${resPayments.rows.length}\n`;
    doc += ` - Deliveries   : ${resDeliveries.rows.length}\n`;
    doc += '========================================================================================\n\n';

    // SECTION 1: ROUTES
    doc += `>>> 1. ROUTES TABLE (Total: ${resRoutes.rows.length} rows)\n`;
    doc += formatTable([
      { key: 'ROUTE_ID', label: 'ROUTE_ID' },
      { key: 'SOURCE', label: 'SOURCE' },
      { key: 'DESTINATION', label: 'DESTINATION' },
      { key: 'DISTANCE', label: 'DISTANCE (km)' },
      { key: 'ESTIMATED_TIME', label: 'EST_TIME (hrs)' }
    ], resRoutes.rows);
    doc += '\n';

    // SECTION 2: WAREHOUSES
    doc += `>>> 2. WAREHOUSES TABLE (Total: ${resWarehouses.rows.length} rows)\n`;
    doc += formatTable([
      { key: 'WAREHOUSE_ID', label: 'WH_ID' },
      { key: 'WAREHOUSE_NAME', label: 'NAME' },
      { key: 'LOCATION', label: 'LOCATION' },
      { key: 'CAPACITY', label: 'CAPACITY' },
      { key: 'CONTACT_NO', label: 'CONTACT' }
    ], resWarehouses.rows);
    doc += '\n';

    // SECTION 3: SHIPMENTS
    doc += `>>> 3. SHIPMENTS TABLE (Total: ${resShipments.rows.length} rows)\n`;
    doc += formatTable([
      { key: 'SHIPMENT_ID', label: 'SHIPMENT_ID' },
      { key: 'CUSTOMER_ID', label: 'CUSTOMER' },
      { key: 'CURRENT_STATUS', label: 'STATUS' },
      { key: 'DELIVERY_TYPE', label: 'TYPE' },
      { key: 'WEIGHT', label: 'WEIGHT (kg)' },
      { key: 'ROUTE_ID', label: 'ROUTE' },
      { key: 'WAREHOUSE_ID', label: 'WH' },
      { key: 'AGENT_ID', label: 'AGENT' },
      { key: 'BOOKING_DATE', label: 'BOOKING_DATE' }
    ], resShipments.rows);
    doc += '\n';

    // SECTION 4: CUSTOMERS
    doc += `>>> 4. CUSTOMERS TABLE (Total: ${resCustomers.rows.length} rows)\n`;
    doc += formatTable([
      { key: 'CUSTOMER_ID', label: 'CUST_ID' },
      { key: 'NAME', label: 'NAME' },
      { key: 'EMAIL', label: 'EMAIL' },
      { key: 'PHONE', label: 'PHONE' },
      { key: 'ADDRESS', label: 'ADDRESS' }
    ], resCustomers.rows);
    doc += '\n';

    // SECTION 5: PAYMENTS
    doc += `>>> 5. PAYMENTS TABLE (Total: ${resPayments.rows.length} rows)\n`;
    doc += formatTable([
      { key: 'PAYMENT_ID', label: 'PAYMENT_ID' },
      { key: 'SHIPMENT_ID', label: 'SHIPMENT' },
      { key: 'AMOUNT', label: 'AMOUNT (₹)' },
      { key: 'PAYMENT_METHOD', label: 'METHOD' },
      { key: 'PAYMENT_STATUS', label: 'STATUS' },
      { key: 'PAYMENT_DATE', label: 'DATE' }
    ], resPayments.rows);
    doc += '\n';

    // SECTION 6: DELIVERIES
    doc += `>>> 6. DELIVERIES TABLE (Total: ${resDeliveries.rows.length} rows)\n`;
    doc += formatTable([
      { key: 'DELIVERY_ID', label: 'DELIVERY_ID' },
      { key: 'SHIPMENT_ID', label: 'SHIPMENT' },
      { key: 'AGENT_ID', label: 'AGENT' },
      { key: 'DELIVERY_STATUS', label: 'STATUS' },
      { key: 'RECEIVER_NAME', label: 'RECEIVER' }
    ], resDeliveries.rows);
    doc += '\n';

    // SECTION 7: AUDIT LOG
    doc += `>>> 7. SYSTEM AUDIT LOG (Most recent 10 events)\n`;
    doc += formatTable([
      { key: 'AUDIT_ID', label: 'AUDIT_ID' },
      { key: 'ACTION_TIME', label: 'TIMESTAMP' },
      { key: 'TABLE_NAME', label: 'TABLE' },
      { key: 'ACTION', label: 'ACTION' },
      { key: 'RECORD_ID', label: 'RECORD_ID' },
      { key: 'DESCRIPTION', label: 'DETAILS' }
    ], resAudit.rows);
    doc += '\n';

    fs.writeFileSync(OUTPUT_FILE, doc, 'utf-8');
    // console.log(`[LiveSync] Successfully updated live_database_records.txt at ${timestampStr}`);
  } catch (err) {
    console.error('[LiveSync] Error dumping database records:', err.message);
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) {}
    }
    isSyncing = false;
  }
}

function triggerLiveSync() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  // Debounce by 250ms
  syncTimeout = setTimeout(() => {
    exportLiveDatabase();
  }, 250);
}

module.exports = {
  exportLiveDatabase,
  triggerLiveSync
};
