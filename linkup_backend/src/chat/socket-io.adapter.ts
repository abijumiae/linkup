import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';

export class SocketIoAdapter extends IoAdapter {
  private readonly logger = new Logger(SocketIoAdapter.name);

  constructor(appContext: INestApplicationContext) {
    super(appContext);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const mergedOptions = {
      ...options,
      path: '/socket.io',
      cors: {
        origin: true,
        credentials: true,
      },
      transports: ['websocket', 'polling'] as ('websocket' | 'polling')[],
      allowEIO3: true,
    };

    // Always attach to the Nest HTTP server when available (Render single-port deploy).
    if (this.httpServer) {
      this.logger.log('Socket.io attached to Nest HTTP server at /socket.io');
      return new Server(this.httpServer, mergedOptions);
    }

    this.logger.warn(
      `Socket.io HTTP server unavailable; creating standalone server on port ${port}`,
    );
    return super.createIOServer(port, mergedOptions);
  }
}
