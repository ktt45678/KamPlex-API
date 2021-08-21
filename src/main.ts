import { BadRequestException, ClassSerializerInterceptor, ValidationError, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import multipart from 'fastify-multipart';
import { AppModule } from './app.module';

import { PORT, ADDRESS, DOCUMENT_TITLE, DOCUMENT_DESCRIPTION, DOCUMENT_VERSION, DOCUMENT_AUTHOR, DOCUMENT_GITHUB, DOCUMENT_EMAIL } from './config';

async function bootstrap() {
  const isDev = process.env.NODE_ENV === 'development' ? true : false;
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: isDev }));
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
    exceptionFactory: (errors: ValidationError[]) => new BadRequestException({ code: Object.values(errors[0]?.contexts)[0]?.code || -1, message: Object.values(errors[0]?.constraints)[0] || '' })
  }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.enableCors();
  app.register(multipart);
  // Use DI on class-validator
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  // Launch server
  const port = process.env.PORT || PORT;
  const address = process.env.ADDRESS || ADDRESS;
  await app.listen(port, address);
}
bootstrap();
