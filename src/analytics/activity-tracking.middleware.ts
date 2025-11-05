import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';

@Injectable()
export class ActivityTrackingMiddleware implements NestMiddleware {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly jwtService: JwtService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Извлекаем токен из заголовка Authorization
      const token = this.extractTokenFromHeader(req);
      
      if (!token) {
        next();
        return;
      }

      // Декодируем и верифицируем JWT токен
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET
      });

      // JWT payload содержит userId в поле 'sub'
      if (payload && payload.sub) {
        // Трекаем активность асинхронно, не блокируя основной запрос
        this.analyticsService
          .trackUserActivity(new Types.ObjectId(payload.sub))
          .catch((error) => {
            // Логируем только ошибки
            console.error('Failed to track user activity:', error);
          });
      }
    } catch (error) {
      // Если токен невалиден или произошла ошибка - просто пропускаем трекинг
      // Не логируем, это нормальная ситуация для неавторизованных запросов
    }

    next();
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

