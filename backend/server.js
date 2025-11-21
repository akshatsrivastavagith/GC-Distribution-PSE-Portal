const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const authRoutes = require('./routes/authRoutes');
const stockRoutes = require('./routes/stockRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET','POST'], credentials: true }
});

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/stock', stockRoutes(io));

// static storage browse (optional)
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// serve config files
app.use('/config', express.static(path.join(__dirname, 'config')));

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

// Export io if needed
module.exports = io;

