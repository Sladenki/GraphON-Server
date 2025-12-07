import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserModel, UserSchema } from './user.model';
import { GraphModel, GraphSchema } from 'src/graph/graph.model';
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

    MongooseModule.forFeature([
      { name: UserModel.name, schema: UserSchema },
      { name: GraphModel.name, schema: GraphSchema },
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
