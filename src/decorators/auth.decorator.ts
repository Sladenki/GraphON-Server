import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
// import { AuthGuard } from "@nestjs/passport";
import { OptionalAuthGuard } from "./OptionalAuthGuard";
import { AuthGuard } from "src/auth/auth.guard";

import { UserRole } from "src/admin/role.enum";
import { AuthWithRolesGuard } from "./AuthWithRoles.decorator";

// Принимаем запросы только от авторизированных пользователей
// export const Auth = () => UseGuards(AuthGuard('jwt'))
export const Auth = () => UseGuards(AuthGuard)

// Принимаем запросы от авторизированных пользователей и неавторизированных (т.к не возвращаем ошибку)
export const OptionalAuth = () => UseGuards(OptionalAuthGuard);

export const AuthRoles = (...roles: UserRole[]) => {
    return applyDecorators(
      SetMetadata('roles', roles),
      UseGuards(AuthWithRolesGuard)
    );
  };