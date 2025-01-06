import { Module } from '@nestjs/common';
import { TypegooseModule } from '@m8a/nestjs-typegoose';
import { UserModel } from 'src/user/user.model';
import { PostModel } from 'src/post/post.model';
import { PostReactionController } from './postReaction.controller';
import { PostReactionService } from './postReaction.service';
import { PostReactionModel } from './postReaction.model';
import { JwtStrategy } from 'src/user/jwt.strategy';
import { GoogleStrategy } from 'src/strategies/google.strategy';
import { GraphModel } from 'src/graph/graph.model';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { getJwtConfig } from 'src/config/jwt.config';

@Module({
  controllers: [PostReactionController],
  providers: [JwtStrategy, GoogleStrategy, PostReactionService],
  imports: [

    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),

    // MongooseModule.forFeature регистрирует модели в данном модуле, чтобы они были доступны через Mongoose в соответствующем сервисе.
    TypegooseModule.forFeature([
      {
        typegooseClass: PostReactionModel,
        schemaOptions: { collection: 'PostReaction' },
      },
      {
        typegooseClass: PostModel,
        schemaOptions: { collection: 'Post' },
      },
      {
        typegooseClass: UserModel,
        schemaOptions: { collection: 'User' },
      },
    ]),
  ],
  exports: [PostReactionService],
})
export class PostReactionModule {}
