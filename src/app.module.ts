import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypegooseModule } from '@m8a/nestjs-typegoose';
import { getMongoConfig } from './config/mongo.config';
import { UserModule } from './user/user.module';
import { PostModule } from './post/post.module';
import { LogginMiddleware } from './logging.middleware';
// import { CacheModule } from '@nestjs/cache-manager';
// import { redisStore } from 'cache-manager-redis-yet';
import { GraphModule } from './graph/graph.module';
import { S3Module } from './s3/s3.module';
import { PostReactionModule } from './postReaction/postReaction.module';
import { UserPostReactionModule } from './userPostReaction/userPostReaction.module';
import { AuthModule } from './auth/auth.module';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphSubsModule } from './graphSubs/graphSubs.module';
import { ScheduleModule } from './schedule/schedule.module';

@Module({
  imports: [
    // Доступ к ENV файлу
    ConfigModule.forRoot(),

    // Для работы с MongoDB
    TypegooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getMongoConfig,
    }),

    PassportModule.register({ session: false }),

    // Хранилище
    S3Module,

    AuthModule,

    UserModule,
    PostModule,

    GraphModule,

    PostReactionModule,
    UserPostReactionModule,

    GraphSubsModule,
    ScheduleModule

  ],
  controllers: [AppController],
  providers: [AppService],
})


export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LogginMiddleware).forRoutes('*');
  }
}
