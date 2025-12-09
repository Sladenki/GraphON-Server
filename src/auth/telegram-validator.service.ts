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
        return false;
      }

      // Проверяем hash
      const botToken = this.configService.get<string>('BOT_TOKEN');
      if (!botToken) {
        return false;
      }

      // Создаем data check string из всех данных кроме hash
      // Сортируем ключи алфавитно и формируем строку key=value\n
      const dataCheckString = Object.keys(allData)
        .sort()
        .map((key) => `${key}=${allData[key]}`)
        .join('\n');

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

      // Сравниваем hash
      return computedHash === hash;
    } catch (error) {
      return false;
    }
  }
}
