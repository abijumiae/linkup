import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { isOriginAllowed } from './common/cors.config';
import { SocketIoAdapter } from './chat/socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const socketAdapter = new SocketIoAdapter(app);
  app.useWebSocketAdapter(socketAdapter);
  console.log('Socket.io adapter configured');

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    compression({
      filter: (req, res) => {
        if (req.url?.includes('/socket.io')) {
          return false;
        }
        return compression.filter(req, res);
      },
    }),
  );

  // Serves /uploads for local storage and legacy media URLs after switching to Cloudinary.
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`LinkUp backend running on port ${port}`);
  console.log('GET /moments and POST /moments available');
  console.log('GET /watch available');
  console.log('POST /uploads available for authenticated media uploads');
  console.log('Socket.io gateway available at /socket.io');
}
bootstrap();
