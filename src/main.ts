import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import multipart from 'fastify-multipart';

import { AppModule } from './app.module';
import { PORT, ADDRESS, DOCUMENT_TITLE, DOCUMENT_DESCRIPTION, DOCUMENT_VERSION, DOCUMENT_AUTHOR, DOCUMENT_GITHUB, DOCUMENT_EMAIL } from './config';

async function bootstrap() {
  const isDev = process.env.NODE_ENV === 'development' ? true : false;
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: isDev }));
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
      while (!error?.constraints && errors[0]?.children.length) {
        error = errors[0]?.children[0];
      }
      return new BadRequestException({
        code: Object.values<any>(error?.contexts)[0]?.code || -1,
        message: Object.values<any>(error?.constraints)[0] || ''
      });
    }
  }));
  //app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.enableCors();
  app.register(multipart);
  // Use DI on class-validator
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  // Launch server
  const port = configService.get<string>('PORT') || PORT;
  const address = configService.get<string>('ADDRESS') || ADDRESS;
  await app.listen(port, address);
}

export let configService: ConfigService<unknown, boolean>;
bootstrap();
