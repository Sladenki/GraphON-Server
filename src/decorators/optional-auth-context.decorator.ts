import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OptionalAuthContext } from '../interfaces/optional-auth.interface';
import { Types } from 'mongoose';

export const GetOptionalAuthContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): OptionalAuthContext => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return {
      isAuthenticated: !!user,
      userId: user?.sub ? new Types.ObjectId(user.sub) : undefined,
      user: user
    };
  },
); 