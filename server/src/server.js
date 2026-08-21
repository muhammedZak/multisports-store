import { createServer } from 'node:http';

import app from './app.js';

import { env } from './config/env.js';

import { connectDatabase } from './config/database.js';

import { initializeSocketServer } from './realtime/socket.server.js';

async function startServer() {
  try {
    await connectDatabase();

    const httpServer = createServer(app);

    /*
     * REST and Socket.IO now share this exact
     * Node HTTP server.
     */
    initializeSocketServer(httpServer);

    httpServer.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);

    process.exit(1);
  }
}

startServer();
