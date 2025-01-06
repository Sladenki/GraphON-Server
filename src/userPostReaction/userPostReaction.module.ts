import { Module } from '@nestjs/common';
import { TypegooseModule } from '@m8a/nestjs-typegoose';
import { UserModel } from 'src/user/user.model';
import { PostModel } from 'src/post/post.model';
import { UserPostReactionController } from './userPostReaction.controller';

import { PostReactionModel } from 'src/postReaction/postReaction.model';
import { UserPostReactionService } from './userPostReaction.service';
import { UserPostReactionModel } from './userPostReaction.model';
import { PostReactionModule } from 'src/postReaction/postReaction.module';
import { JwtStrategy } from 'src/user/jwt.strategy';
import { GoogleStrategy } from 'src/strategies/google.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { getJwtConfig } from 'src/config/jwt.config';

@Module({
  controllers: [UserPostReactionController],
  providers: [JwtStrategy, GoogleStrategy, UserPostReactionService],
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
        typegooseClass: UserPostReactionModel,
        schemaOptions: { collection: 'UserPostReaction' },
      },
      {
        typegooseClass: PostReactionModel,
        schemaOptions: { collection: 'PostReaction' },
      },
      {
        typegooseClass: UserModel,
        schemaOptions: { collection: 'User' },
      },
    ]),
    PostReactionModule,
  ],
  exports: [UserPostReactionService],
})
export class UserPostReactionModule {}
