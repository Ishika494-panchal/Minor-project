const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const proposalRoutes = require('./routes/proposalRoutes');
const messageRoutes = require('./routes/messageRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const gigRoutes = require('./routes/gigRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT']
  }
});

const activeUsers = new Map();
app.set('io', io);
app.set('activeUsers', activeUsers);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || '';
    if (!token) {
      return next(new Error('Unauthorized: token missing'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id).select('_id role');
    if (!user) {
      return next(new Error('Unauthorized: user not found'));
    }
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Unauthorized: token invalid'));
  }
});

io.on('connection', (socket) => {
  const userId = String(socket.user._id);
  const userRoom = `user:${userId}`;
  socket.join(userRoom);

  const existingSet = activeUsers.get(userId) || new Set();
  existingSet.add(socket.id);
  activeUsers.set(userId, existingSet);

  socket.emit('chat:connected', { userId, socketId: socket.id });

  socket.on('chat:conversation:open', ({ conversationId }) => {
    if (conversationId) {
      socket.join(`conversation:${conversationId}`);
    }
  });

  socket.on('disconnect', () => {
    const userSockets = activeUsers.get(userId);
    if (!userSockets) return;
    userSockets.delete(socket.id);
    if (userSockets.size === 0) {
      activeUsers.delete(userId);
    } else {
      activeUsers.set(userId, userSockets);
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`API + Socket server running on port ${PORT}`);
});
