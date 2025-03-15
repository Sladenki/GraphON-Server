import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import * as fs from 'fs';


async function bootstrap() {

  // ---- C HTTPS ----
  // Автоматические добавление api к каждому запросу
  // Читаем SSL-сертификаты
  const httpsOptions = {
    key: fs.readFileSync(process.env.KEY),  // Укажи правильный путь
    cert: fs.readFileSync(process.env.CERT),
  };

  const app = await NestFactory.create(AppModule, { httpsOptions });

  // Автоматические добавление api к каждому запросу
  app.setGlobalPrefix('api');

  app.use(cookieParser())

  // ---- Без HTTPS ----
  // const app = await NestFactory.create(AppModule);

  // // Автоматические добавление api к каждому запросу
  // app.setGlobalPrefix('api');

  // app.use(cookieParser())

  // -----

  app.enableCors({
    // по этому адресу - клиент
    origin: [
      process.env.CLIENT_URL,
      'capacitor://localhost',
      'ionic://localhost', 
      'http://localhost', 
      'https://localhost',
      'https://graphon.up.railway.app',  
      'http://localhost:8080',
      'https://graphon-client.onrender.com',
      'https://t.me'
    ],
    credentials: true,
    exposedHeaders: 'set-cookie',
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  })

  await app.listen(process.env.SERVER_PORT);
}
bootstrap();
