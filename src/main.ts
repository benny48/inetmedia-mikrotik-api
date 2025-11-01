// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Inet Media Billing API')
    .setDescription(
      'Boring Project API documentation for Inet Media Sejahtera billing system',
    )
    .setVersion('1.0.0')
    .addBearerAuth() // aktifkan kalau nanti pakai auth
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/docs', app, document, {
    jsonDocumentUrl: '/docs/json',
  });

  await app.listen(3000);
}
bootstrap();
