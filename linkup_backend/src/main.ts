import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import { SocketIoAdapter } from './chat/socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const socketAdapter = new SocketIoAdapter(app);
  app.useWebSocketAdapter(socketAdapter);
  console.log('Socket.io adapter configured');

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

  // Serves uploaded media from linkup_backend/uploads (ephemeral on Render).
  // TODO: Render local filesystem is temporary. Move uploads to Cloudinary/S3/Supabase Storage before real public launch.
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`LinkUp backend running on port ${port}`);
  console.log('POST /moments available for authenticated moment drops');
  console.log('POST /uploads available for authenticated media uploads');
  console.log('Socket.io gateway available at /socket.io');
}
bootstrap();
