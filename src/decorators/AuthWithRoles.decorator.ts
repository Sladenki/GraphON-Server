import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { RoleHierarchy, UserRole } from 'src/admin/role.enum';

declare module 'express' {
  interface Request {
    user?: any;
  }
}

@Injectable()
export class AuthWithRolesGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Извлекаем токен из заголовков запроса
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Отсутствует токен');
    }

    let payload: any;
    try {
      // Проверяем JWT и декодируем payload
      payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET
      });

      // Сохраняем payload в request.user для использования в других местах
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException('Неверный токен');
    }

    // Извлекаем требуемые роли из метаданных маршрута (установлены через @AuthRoles)
    const requiredRoles = this.reflector.get<UserRole[]>('roles', context.getHandler());

    // Если роли не указаны — маршрут доступен для всех авторизованных пользователей
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const user = request.user;
    if (!user || !user.role) return false;

    // Получаем "уровень доступа" текущего пользователя
    const userLevel = RoleHierarchy[user.role as UserRole] ?? -1;

    // Получаем максимальный необходимый уровень доступа для маршрута
    const maxRequiredLevel = Math.max(...requiredRoles.map(role => RoleHierarchy[role]));

    // Разрешаем доступ, если уровень пользователя >= необходимого
    return userLevel >= maxRequiredLevel;
  }

  // Вспомогательная функция: извлечение токена из заголовков запроса
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
