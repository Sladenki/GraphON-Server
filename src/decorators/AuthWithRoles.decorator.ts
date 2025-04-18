import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthWithRolesGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET
      });
      request['user'] = payload;
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }

    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());

    console.log('requiredRoles', requiredRoles)

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const user = request.user;



    if (!user || !user.role) return false;

    return requiredRoles.includes(user.role);
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
