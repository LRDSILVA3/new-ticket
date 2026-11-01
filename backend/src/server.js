const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const store = require('./db/store');
const setupWebSocket = require('./socket');
const tenantsRouter = require('./routes/tenants');
const ticketsRouterFactory = require('./routes/tickets');

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Setup WebSocket Hub
const wsHub = setupWebSocket(io);

// Mount API routes
app.use('/api/tenants', tenantsRouter);
app.use('/api/tickets', ticketsRouterFactory(io, wsHub));

// Health check and system metadata
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    tenantsCount: store.getTenants().length,
    activeTicketsCount: store.data.tickets.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length,
    version: '1.0.0-multitenant-queue'
  });
});

// Serve frontend static build if available
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA Catch-all middleware
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 NextQueue Multi-Tenant Server Running:`);
  console.log(`   Local URL:    http://localhost:${PORT}`);
  console.log(`   Network URL:  http://0.0.0.0:${PORT}`);
  console.log(`   WebSocket:    Ready on port ${PORT}`);
  console.log(`=======================================================`);
});

module.exports = { app, server, io };
