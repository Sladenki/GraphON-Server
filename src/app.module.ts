import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypegooseModule } from '@m8a/nestjs-typegoose';
import { getMongoConfig } from './config/mongo.config';
import { UserModule } from './user/user.module';
// import { UserSubsModule } from './userSubs/userSubs.module';
import { PostModule } from './post/post.module';
import { LogginMiddleware } from './logging.middleware';
// import { CacheModule } from '@nestjs/cache-manager';
// import { redisStore } from 'cache-manager-redis-yet';
import { GraphModule } from './graph/graph.module';
import { PostTagModule } from './postTag/postTag.module';
import { TaggedPostModule } from './taggedPost/taggedPost.module';
// import { PythonModule } from './microservice/python.module';
import { S3Module } from './s3/s3.module';
import { PostReactionModule } from './postReaction/postReaction.module';
import { UserPostReactionModule } from './userPostReaction/userPostReaction.module';
import { AuthModule } from './auth/auth.module';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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

    // Redis
    // CacheModule.registerAsync({
    //   isGlobal: true,
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: async (configService: ConfigService) => ({
    //     store: redisStore,
    //     host: configService.get<string>('REDIS_HOST'),
    //     port: configService.get<number>('REDIS_PORT'),
    //     ttl: 0, // время хранения = бессрочно
    //   }),
    // }),

    // Хранилище
    S3Module,

    AuthModule,

    UserModule,
    // // UserSubsModule,
    PostModule,

    PostTagModule,
    TaggedPostModule,
    GraphModule,

    PostReactionModule,
    UserPostReactionModule,

    // PythonModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LogginMiddleware).forRoutes('*');
  }
}
