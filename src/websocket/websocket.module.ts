import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getJwtConfig } from 'src/config/jwt.config';
import { WebSocketGatewayService } from './websocket-gateway.service';
import { RelationshipsWebSocketGateway } from './websocket.gateway';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),
  ],
  providers: [WebSocketGatewayService, RelationshipsWebSocketGateway],
  exports: [WebSocketGatewayService],
})
export class WebSocketModule {}

