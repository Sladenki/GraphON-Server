import { Global, Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getJwtConfig } from 'src/config/jwt.config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { JwtAuthService } from './jwt.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),
  ],
  providers: [
    {
      provide: JwtService,
      useFactory: (configService: ConfigService) => {
        return new JwtService({
          secret: configService.get('JWT_SECRET'),
          signOptions: { expiresIn: '30d' }
        });
      },
      inject: [ConfigService]
    },
    Reflector,
    JwtAuthGuard,
    JwtAuthService
  ],
  exports: [JwtService, JwtAuthGuard, JwtAuthService],
})
export class JwtGlobalModule {} 