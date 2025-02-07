import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Автоматические добавление api к каждому запросу
  app.setGlobalPrefix('api');

  app.use(cookieParser())

  app.enableCors({
    // по этому адресу - клиент
    origin: [
      process.env.CLIENT_URL,
      'capacitor://localhost',
      'ionic://localhost', 
      'http://localhost', 
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
