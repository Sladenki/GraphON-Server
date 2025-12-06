import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        try {
          const { createClient } = await import('@redis/client');
          
          const client = createClient({
            socket: {
              host: configService.get('redis.host'),
              port: configService.get('redis.port'),
              reconnectStrategy: (retries) => {
                if (retries > 3) {
                  console.warn('⚠️  Redis: Max reconnection attempts reached. Continuing without Redis cache.');
                  return false; // Останавливаем попытки переподключения
                }
                return Math.min(retries * 100, 3000);
              },
            },
          });

          console.log('🔗 Connecting to Redis...');
          console.log(`   Host: ${configService.get('redis.host')}:${configService.get('redis.port')}`);
          console.log(`   Default TTL: 24 hours (86400s)`);

          await client.connect();
          console.log('✅ Redis connected successfully');
          return client;
        } catch (error) {
          console.warn('⚠️  Redis connection failed. Application will continue without Redis cache.');
          console.warn(`   Error: ${error.message}`);
          console.warn('   To enable Redis cache, make sure Redis server is running on the configured host:port');
          return null; // Возвращаем null если не удалось подключиться
        }
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {} 