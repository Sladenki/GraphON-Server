import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {

  const app = await NestFactory.create(AppModule);

  // Автоматические добавление api к каждому запросу
  app.setGlobalPrefix('api');

  // Включение валидации DTO
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Удаляет свойства, которых нет в DTO
    forbidNonWhitelisted: true, // Выбрасывает ошибку при наличии лишних свойств
    transform: true, // Автоматически преобразует типы
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  app.use(cookieParser())

  // // -----

  app.enableCors({
    origin: ['https://graphon.kozow.com'],
    credentials: true,
    methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie'],
  })

  await app.listen(process.env.SERVER_PORT);
}
bootstrap();
