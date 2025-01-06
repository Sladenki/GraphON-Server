import { TypegooseModule } from '@m8a/nestjs-typegoose';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getJwtConfig } from 'src/config/jwt.config';
import { AuthController } from './auth.controller';
import { JwtStrategy } from 'src/user/jwt.strategy';
import { UserModel } from 'src/user/user.model';
import { GoogleStrategy } from 'src/strategies/google.strategy';

@Module({
  controllers: [AuthController],
  providers: [JwtStrategy, GoogleStrategy],
  imports: [
    // для JWT
    ConfigModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),
    TypegooseModule.forFeature([
      {
        // Ссылка на модель пользователя
        typegooseClass: UserModel,
        // Название коллекции в БД
        schemaOptions: { collection: 'User' },
      },
    ]),
  ],
})
export class AuthModule {}
