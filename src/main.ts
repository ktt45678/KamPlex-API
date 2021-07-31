import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

import { PORT, ADDRESS, DOCUMENT_TITLE, DOCUMENT_DESCRIPTION, DOCUMENT_VERSION, DOCUMENT_AUTHOR, DOCUMENT_GITHUB, DOCUMENT_EMAIL } from './config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: true }));
  // Setup Swagger UI
  const swaggerDocument = SwaggerModule.createDocument(app, new DocumentBuilder()
    .setTitle(DOCUMENT_TITLE)
    .setDescription(DOCUMENT_DESCRIPTION)
    .setVersion(DOCUMENT_VERSION)
    .setContact(DOCUMENT_AUTHOR, DOCUMENT_GITHUB, DOCUMENT_EMAIL)
    .build());
  SwaggerModule.setup('document', app, swaggerDocument);
  // Validation and cors
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    stopAtFirstError: true,
    exceptionFactory: (errors: ValidationError[]) => new BadRequestException({ property: errors[0].property, message: Object.values(errors[0].constraints)[0] })
  }));
  app.enableCors();
  // Launch server
  const port = process.env.PORT || PORT;
  const address = process.env.ADDRESS || ADDRESS;
  await app.listen(port, address);
}
bootstrap();
