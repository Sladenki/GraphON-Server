import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {
  try {
    console.log('📦 Starting application...');
    
    const app = await NestFactory.create(AppModule);
    console.log('✅ App module created successfully');

    // Автоматические добавление api к каждому запросу
    app.setGlobalPrefix('api');
    console.log('✅ Global prefix "api" set');

    // Включение валидации DTO
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true, // Удаляет свойства, которых нет в DTO
      forbidNonWhitelisted: true, // Выбрасывает ошибку при наличии лишних свойств
      transform: true, // Автоматически преобразует типы
      transformOptions: {
        enableImplicitConversion: true,
      },
    }));
    console.log('✅ Validation pipes configured');

    app.use(cookieParser())
    console.log('✅ Cookie parser configured');

    // // -----

    app.enableCors({
      origin: ['https://graphon.kozow.com', 'http://localhost:3000', 'http://localhost:4200', 'http://127.0.0.1:4200'],
      credentials: true,
      methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['set-cookie'],
    })
    console.log('✅ CORS enabled');

    // Включаем shutdown hooks для корректного завершения
    app.enableShutdownHooks();
    console.log('✅ Shutdown hooks enabled');

    const port = process.env.SERVER_PORT || 4200;
    const portNumber = typeof port === 'string' ? parseInt(port, 10) : port;
    console.log(`🔌 Attempting to listen on port ${portNumber}...`);
    
    // Получаем HTTP сервер ДО вызова listen
    const httpServer = app.getHttpServer();
    
    // Настраиваем обработчики событий
    const serverReady = new Promise<void>((resolve, reject) => {
      httpServer.once('listening', () => {
        const address = httpServer.address();
        if (address) {
          const actualPort = typeof address === 'object' && address ? address.port : portNumber;
          const actualAddress = typeof address === 'object' && address ? address.address : '0.0.0.0';
          const displayAddress = actualAddress === '::' || actualAddress === '0.0.0.0' ? 'localhost' : actualAddress;
          
          console.log(`\n🚀 Server is running!`);
          console.log(`   Listening: ${httpServer.listening}`);
          console.log(`   Address: ${actualAddress}:${actualPort}`);
          console.log(`   URL: http://${displayAddress}:${actualPort}`);
          console.log(`   API: http://${displayAddress}:${actualPort}/api`);
        }
        resolve();
      });

      httpServer.once('error', (error: any) => {
        console.error('❌ Error binding to port:', error);
        if (error.code === 'EADDRINUSE') {
          console.error(`⚠️  Port ${portNumber} is already in use!`);
        }
        reject(error);
      });
    });

    // Запускаем сервер без await, чтобы не блокировать выполнение
    // onApplicationBootstrap может блокировать, но сервер должен запуститься
    console.log('📞 Starting HTTP server...');
    app.listen(portNumber, '0.0.0.0').catch((error) => {
      console.error('❌ Error in app.listen():', error);
    });
    
    // Ждем события listening с таймаутом
    const timeout = new Promise<void>((resolve) => {
      setTimeout(() => {
        // Проверяем состояние сервера вручную
        const address = httpServer.address();
        const isListening = httpServer.listening;
        
        if (isListening && address) {
          const actualPort = typeof address === 'object' && address ? address.port : portNumber;
          const actualAddress = typeof address === 'object' && address ? address.address : '0.0.0.0';
          const displayAddress = actualAddress === '::' || actualAddress === '0.0.0.0' ? 'localhost' : actualAddress;
          
          console.log(`\n✅ Server is running! (checked after timeout)`);
          console.log(`   Listening: ${isListening}`);
          console.log(`   Address: ${actualAddress}:${actualPort}`);
          console.log(`   URL: http://${displayAddress}:${actualPort}`);
          console.log(`   API: http://${displayAddress}:${actualPort}/api`);
        } else {
          console.log(`\n⚠️  Server status after timeout:`);
          console.log(`   Listening: ${isListening}`);
          console.log(`   Address: ${JSON.stringify(address)}`);
        }
        resolve();
      }, 3000); // 3 секунды таймаут
    });
    
    // Ждем либо события listening, либо таймаута
    await Promise.race([serverReady, timeout]);
  } catch (error) {
    console.error('❌ Error starting server:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}
bootstrap();
