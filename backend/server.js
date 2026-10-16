require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Request logger for visibility
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Auto-export live database state to live_database_records.txt on any mutating HTTP request
const { triggerLiveSync, exportLiveDatabase } = require('./utils/liveSync');
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        triggerLiveSync();
      }
    });
  }
  next();
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check endpoint (works even without Oracle)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    server: 'running',
    oracle: global.oracleConnected ? 'connected' : 'disconnected',
    message: global.oracleConnected
      ? 'Oracle database connected successfully'
      : 'Oracle database NOT connected. Check your DB_CONNECT_STRING in .env'
  });
});

// Mount all routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customer'));
app.use('/api/employees', require('./routes/employee'));
app.use('/api/shipments', require('./routes/shipment'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/payments', require('./routes/payment'));
app.use('/api/deliveries', require('./routes/delivery'));
app.use('/api/agent', require('./routes/agent'));
app.use('/api/warehouses', require('./routes/warehouse'));
app.use('/api/warehouse', require('./routes/warehouseStaff'));
app.use('/api/routes', require('./routes/route'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/reports', require('./routes/reports'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  const database = require('./config/database');

  // Try to connect Oracle — but don't crash if it fails
  try {
    await database.initialize();
    global.oracleConnected = true;
    console.log('✅ Oracle database pool initialized successfully');

    // Auto-generate live_database_records.txt on startup
    exportLiveDatabase();
  } catch (err) {
    global.oracleConnected = false;
    console.error('❌ Oracle database connection FAILED:', err.message);
    console.error('');
    console.error('=== ORACLE SETUP REQUIRED ===');
    console.error('The backend server will still start, but ALL API calls');
    console.error('that require Oracle will return an error.');
    console.error('');
    console.error('To fix:');
    console.error('1. Install Docker Desktop: https://www.docker.com/products/docker-desktop/');
    console.error('2. Run: docker run -d -p 1521:1521 -e ORACLE_PWD=Oracle123 --name oracle-xe container-registry.oracle.com/database/free:latest');
    console.error('3. Restart this server');
    console.error('');
    console.error('Current DB settings (.env):');
    console.error('  DB_USER:', process.env.DB_USER);
    console.error('  DB_CONNECT_STRING:', process.env.DB_CONNECT_STRING);
    console.error('=============================');
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 LogiTrack server running at http://localhost:${PORT}`);
    console.log(`📊 Oracle status: ${global.oracleConnected ? '✅ Connected' : '❌ Not connected'}`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
      if (global.oracleConnected) await database.close();
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT: closing server...');
    server.close(async () => {
      if (global.oracleConnected) await database.close();
      process.exit(0);
    });
  });
}

startServer();
