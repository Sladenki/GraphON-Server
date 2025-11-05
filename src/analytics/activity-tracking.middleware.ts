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
    console.log('🔍 ActivityTrackingMiddleware called for:', req.method, req.path);
    
    try {
      // Извлекаем токен из заголовка Authorization
      const token = this.extractTokenFromHeader(req);
      
      if (!token) {
        console.log('⚠️ No JWT token found, skipping tracking');
        next();
        return;
      }

      // Декодируем и верифицируем JWT токен
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET
      });
      
      console.log('👤 Decoded JWT payload:', payload);

      // JWT payload содержит userId в поле 'sub'
      if (payload && payload.sub) {
        console.log('✅ Tracking activity for user:', payload.sub);
        
        // Трекаем активность асинхронно, не блокируя основной запрос
        this.analyticsService
          .trackUserActivity(new Types.ObjectId(payload.sub))
          .then(() => {
            console.log('✅ Activity tracked successfully for user:', payload.sub);
          })
          .catch((error) => {
            // Логируем ошибку, но не прерываем запрос
            console.error('❌ Failed to track user activity:', error);
          });
      } else {
        console.log('⚠️ No sub in JWT payload, skipping tracking');
      }
    } catch (error) {
      // Если токен невалиден или произошла ошибка - просто пропускаем трекинг
      console.log('⚠️ JWT verification failed or error occurred, skipping tracking');
    }

    next();
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

