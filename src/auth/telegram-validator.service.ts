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
  validateTelegramData(query: any, originalUrl?: string): boolean {
    try {
      // Извлекаем hash отдельно
      const hash = query.hash;
      
      // Создаем копию query без hash
      const allData: any = {};
      for (const key in query) {
        if (key !== 'hash') {
          allData[key] = query[key];
        }
      }

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
      const sortedKeys = Object.keys(allData).sort();
      const dataCheckString = sortedKeys
        .map((key) => `${key}=${allData[key]}`)
        .join('\n');

      console.log('[TelegramValidator] Sorted keys:', sortedKeys);
      console.log('[TelegramValidator] Data check string:', dataCheckString);
      console.log('[TelegramValidator] Received hash:', hash);

      // Генерируем secret key для Login Widget
      // Для Login Widget: secret_key = SHA-256(bot_token)
      // Для Web App: secret_key = HMAC-SHA-256('WebAppData', bot_token)
      // Используем алгоритм для Login Widget
      const secretKey = crypto
        .createHash('sha256')
        .update(botToken)
        .digest();

      // Вычисляем hash
      const computedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      console.log('[TelegramValidator] Computed hash:', computedHash);
      console.log('[TelegramValidator] Hashes match:', computedHash === hash);
      console.log('[TelegramValidator] BOT_TOKEN first 10 chars:', botToken.substring(0, 10) + '...');

      // Сравниваем hash
      const isValid = computedHash === hash;
      
      
      return isValid;
    } catch (error) {
      console.error('[TelegramValidator] Error:', error);
      console.error('[TelegramValidator] Error stack:', error.stack);
      return false;
    }
  }
}
