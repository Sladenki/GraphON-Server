import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const { createClient } = await import('@redis/client');
        
        const client = createClient({
          socket: {
            host: configService.get('redis.host'),
            port: configService.get('redis.port'),
          },
          password: configService.get('redis.password'),
          database: configService.get('redis.db'),
        });

        console.log('🔗 Connecting to Redis...');
        console.log(`   Host: ${configService.get('redis.host')}:${configService.get('redis.port')}`);
        console.log(`   Database: ${configService.get('redis.db')}`);
        console.log(`   TTL: ${configService.get('redis.ttl')}s`);

        await client.connect();
        console.log('✅ Redis connected successfully');

        return client;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {} 