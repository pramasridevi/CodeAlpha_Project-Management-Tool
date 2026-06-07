import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import mongoose from 'mongoose';
import cors from 'cors';
import router from './server/routes';
import { setSocketRoomsManager } from './server/controllers';

const PORT = 3000;
const HOST = '0.0.0.0';

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Initialize socket.io with CORS fallback
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Express Middlewares
  app.use(cors());
  app.use(express.json());

  // Mount Application Routes
  app.use('/api', router);

  // Healthcheck Route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: process.env.MONGODB_URI ? 'mongodb' : 'local-json' });
  });

  // Track online users globally
  const onlineUserIds = new Set<string>();
  const socketUserMap = new Map<string, string>(); // socketId -> userId

  // Configure Socket.io Events
  io.on('connection', (socket) => {
    console.log(`Collaborator connected: ${socket.id}`);

    // Subscribe to Project updates (Trello room)
    socket.on('join_project', (projectId: string) => {
      socket.join(`project_${projectId}`);
      console.log(`Socket ${socket.id} entered workspace room: project_${projectId}`);
    });

    socket.on('leave_project', (projectId: string) => {
      socket.leave(`project_${projectId}`);
      console.log(`Socket ${socket.id} exited workspace room: project_${projectId}`);
    });

    // Subscribe to User targeted feeds (Alerts room)
    socket.on('join_user', (userId: string) => {
      socket.join(`user_${userId}`);
      onlineUserIds.add(userId);
      socketUserMap.set(socket.id, userId);
      
      // Update everyone on online status changes
      io.emit('online_users', Array.from(onlineUserIds));
      console.log(`User registered presence: user_${userId}`);
    });

    socket.on('disconnect', () => {
      const userId = socketUserMap.get(socket.id);
      if (userId) {
        onlineUserIds.delete(userId);
        socketUserMap.delete(socket.id);
        io.emit('online_users', Array.from(onlineUserIds));
      }
      console.log(`Collaborator disconnected: ${socket.id}`);
    });
  });

  // Configure target room broadcaster inside controllers
  setSocketRoomsManager({
    broadcastToProject: (projectId, event, payload) => {
      io.to(`project_${projectId}`).emit(event, payload);
    },
    broadcastToUser: (userId, event, payload) => {
      io.to(`user_${userId}`).emit(event, payload);
    }
  });

  // Connect MongoDB Atlas optionally
  if (process.env.MONGODB_URI) {
    console.log('Connecting to MongoDB Atlas...');
    mongoose.connect(process.env.MONGODB_URI)
      .then(() => {
        console.log('📊 MongoDB status: MongoDB Atlas Connected.');
      })
      .catch((error) => {
        console.error('📊 MongoDB connection failure warning:', error.message);
      });
  } else {
    console.log('📊 MongoDB status: Using file-based persistent local storage (data_db.json).');
  }

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    // Mount Vite asset development proxy last
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`🚀 Project Workspace running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Fatal server boot failure:', error);
});
