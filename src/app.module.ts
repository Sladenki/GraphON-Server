import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { getMongoConfig } from './config/mongo.config';
import { UserModule } from './user/user.module';
import { LogginMiddleware } from './logging.middleware';
import { GraphModule } from './graph/graph.module';
import { S3Module } from './s3/s3.module';
import { AuthModule } from './auth/auth.module';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphSubsModule } from './graphSubs/graphSubs.module';
import { ScheduleModule } from './schedule/schedule.module';
import { EventModule } from './event/event.module';
import { TelegramBotModule } from './telegram/telegram.module';
import { APP_GUARD } from '@nestjs/core';
import { AdminModule } from './admin/admin.module';
import { AuthWithRolesGuard } from './decorators/AuthWithRoles.decorator';
import { EventRegsModule } from './eventRegs/eventRegs.module';
import { JwtGlobalModule } from './jwt/jwt.module';
import redisConfig from './config/redis.config';
import { MongoModule } from './mongo/mongo.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DownloadsModule } from './downloads/downloads.module';
import { RequestsConnectedGraphModule } from './requestsConnectedGraph/requests-connected-graph.module';

@Module({
  imports: [
    // Доступ к ENV файлу
    ConfigModule.forRoot({
      load: [redisConfig],
    }),

    // Для работы с MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getMongoConfig,
    }),

    PassportModule.register({ session: false }),

    // Хранилище
    S3Module,

    AuthModule,
    UserModule,
    GraphModule,
    GraphSubsModule,
    ScheduleModule,
    EventModule,
    TelegramBotModule,
    EventRegsModule,
    AdminModule,
    JwtGlobalModule,
    MongoModule,
    AnalyticsModule,
    DownloadsModule,
    RequestsConnectedGraphModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // {
    //   provide: APP_GUARD,
    //   useClass: AuthWithRolesGuard,
    // },
  ],
})


export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Импортируем ActivityTrackingMiddleware внутри функции для избежания circular dependency
    const { ActivityTrackingMiddleware } = require('./analytics/activity-tracking.middleware');
    
    consumer
      .apply(LogginMiddleware, ActivityTrackingMiddleware)
      .forRoutes('*path');
  }
}
