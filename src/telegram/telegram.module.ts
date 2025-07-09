import { Module } from '@nestjs/common';
import { TelegramBotService } from './telegram.service';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    // для JWT
    ConfigModule,
    UserModule,
  ],
  providers: [TelegramBotService],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}
