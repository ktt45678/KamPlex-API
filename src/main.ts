import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import fastifyMultipart from '@fastify/multipart';
import fastifyCookie from '@fastify/cookie';

import { AppModule } from './app.module';
import { DOCUMENT_TITLE, DOCUMENT_DESCRIPTION, DOCUMENT_VERSION, DOCUMENT_AUTHOR, DOCUMENT_GITHUB, DOCUMENT_EMAIL } from './config';
import { applyMongoDBPatches } from './utils';

async function bootstrap() {
  const isDev = process.env.NODE_ENV === 'development' ? true : false;
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(
    {
      logger: {
        level: isDev ? 'info' : 'warn'
      },
      trustProxy: process.env.TRUST_PROXY === 'true'
    }
  ));
  configService = app.get(ConfigService);
  // Setup Swagger UI
  if (isDev) {
    const swaggerDocument = SwaggerModule.createDocument(app, new DocumentBuilder()
      .setTitle(DOCUMENT_TITLE)
      .setDescription(DOCUMENT_DESCRIPTION)
      .setVersion(DOCUMENT_VERSION)
      .setContact(DOCUMENT_AUTHOR, DOCUMENT_GITHUB, DOCUMENT_EMAIL)
      .addBearerAuth({ type: 'apiKey', in: 'header', name: 'authorization', bearerFormat: 'JWT', description: 'JWT token only' })
      .build());
    SwaggerModule.setup('docs', app, swaggerDocument);
  }
  // Validation, cors and other plugins
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    stopAtFirstError: true,
    exceptionFactory: (errors: ValidationError[]) => {
      let error = errors[0];
      while (!error?.constraints && error?.children.length) {
        error = error.children[0];
      }
      return new BadRequestException({
        code: Object.values<any>(error?.contexts || {})[0]?.code || -1,
        message: Object.values<any>(error?.constraints)[0] || ''
      });
    }
  }));
  //app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.enableCors({
    origin: configService.get<string>('ORIGIN_URL'),
    credentials: true
  });
  await app.register(fastifyMultipart);
  await app.register(fastifyCookie, {
    secret: configService.get<string>('COOKIE_SECRET'),
    parseOptions: {
      domain: configService.get<string>('COOKIE_DOMAIN'),
      path: '/',
      httpOnly: true,
      sameSite: 'strict'
    }
  });
  // Use DI on class-validator
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  // Socket Io Redis Adapter
  //const redisIoAdapter = new RedisIoAdapter(app);
  //await redisIoAdapter.connectToRedis();
  //app.useWebSocketAdapter(redisIoAdapter);
  // Launch server
  const port = configService.get<string>('PORT');
  const address = configService.get<string>('ADDRESS');
  await app.listen(port, address);
}

export let configService: ConfigService<unknown, boolean>;
applyMongoDBPatches();
bootstrap();
