import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class TelegramValidatorService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Валидация данных от Telegram Web App
   * Проверяет hash и auth_date для защиты от подделки данных
   */
  validateTelegramData(query: any): boolean {
    try {
      const { hash, auth_date, ...data } = query;

      // Проверяем наличие обязательных полей
      if (!hash || !auth_date) {
        return false;
      }

      // Проверяем, что auth_date не старше 24 часов (защита от replay атак)
      const authDate = parseInt(auth_date, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      const timeDifference = currentTime - authDate;

      // Данные старше 24 часов считаются невалидными
      if (timeDifference > 86400) {
        return false;
      }

      // Проверяем hash
      const botToken = this.configService.get<string>('BOT_TOKEN');
      if (!botToken) {
        return false;
      }

      // Создаем data check string
      const dataCheckString = Object.keys(data)
        .sort()
        .map((key) => `${key}=${data[key]}`)
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
