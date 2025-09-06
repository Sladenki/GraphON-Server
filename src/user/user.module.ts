import { TypegooseModule } from '@m8a/nestjs-typegoose';
import { UserController } from './user.controller';
import { UserModel } from './user.model';
import { GraphModel } from 'src/graph/graph.model';
import { UserService } from './user.service';
import { Module } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getJwtConfig } from 'src/config/jwt.config';
import { PassportModule } from '@nestjs/passport';

@Module({
  controllers: [UserController],
  providers: [UserService, JwtStrategy],
  imports: [
    // для JWT
    ConfigModule,
    PassportModule,

    TypegooseModule.forFeature([
      {
        // Ссылка на модель пользователя
        typegooseClass: UserModel,
        // Название коллекции в БД
        schemaOptions: { collection: 'User' },
      },
      {
        // Ссылка на модель графа (для популяции и бэкофила)
        typegooseClass: GraphModel,
        schemaOptions: { collection: 'Graph' },
      },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),
  ],
  exports: [UserService],
})
export class UserModule {}
