import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class TelegramValidatorService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Валидация данных от Telegram Web App
   * Проверяет hash для защиты от подделки данных
   */
  validateTelegramData(query: any): boolean {
    try {
      const { hash, ...allData } = query;

      // Проверяем наличие hash
      if (!hash) {
        console.log('[TelegramValidator] Hash is missing');
        return false;
      }

      // Проверяем hash
      const botToken = this.configService.get<string>('BOT_TOKEN');
      if (!botToken) {
        console.log('[TelegramValidator] BOT_TOKEN is missing');
        return false;
      }

      // Создаем data check string из всех данных кроме hash
      // Сортируем ключи алфавитно и формируем строку key=value\n
      // Важно: используем исходные значения (URL уже декодирован Express)
      const dataCheckString = Object.keys(allData)
        .sort()
        .map((key) => `${key}=${allData[key]}`)
        .join('\n');

      console.log('[TelegramValidator] Data check string:', dataCheckString.replace(/\n/g, '\\n'));
      console.log('[TelegramValidator] Received hash:', hash);
      console.log('[TelegramValidator] All data keys:', Object.keys(allData).sort());

      // Генерируем secret key
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

      // Вычисляем hash
      const computedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      console.log('[TelegramValidator] Computed hash:', computedHash);
      console.log('[TelegramValidator] Hashes match:', computedHash === hash);

      // Сравниваем hash
      const isValid = computedHash === hash;
      
      if (!isValid) {
        console.log('[TelegramValidator] Validation failed - hash mismatch');
      }
      
      return isValid;
    } catch (error) {
      console.error('[TelegramValidator] Error:', error);
      return false;
    }
  }
}
