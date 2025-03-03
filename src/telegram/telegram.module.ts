import { Module } from '@nestjs/common';
import { TelegramBotService } from './telegram.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    // для JWT
    ConfigModule,
  ],
  providers: [TelegramBotService],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}
