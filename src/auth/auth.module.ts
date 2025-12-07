import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getJwtConfig } from 'src/config/jwt.config';
import { AuthController } from './auth.controller';
import { JwtStrategy } from 'src/user/jwt.strategy';
import { UserModel, UserSchema } from 'src/user/user.model';
import { TelegramBotModule } from 'src/telegram/telegram.module';

@Module({
  controllers: [AuthController],
  providers: [JwtStrategy],
  imports: [
    // для JWT
    ConfigModule,

    TelegramBotModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),
    MongooseModule.forFeature([
      { name: UserModel.name, schema: UserSchema },
    ]),
  ],
})
export class AuthModule {}
