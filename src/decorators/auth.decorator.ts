import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { AuthGuard } from "src/auth/auth.guard";

import { UserRole } from "src/admin/role.enum";
import { AuthWithRolesGuard } from "./AuthWithRoles.decorator";

// Принимаем запросы только от авторизированных пользователей
export const Auth = () => UseGuards(AuthGuard)

// Принимаем запросы только от пользователей с определенными ролями + требуем авторизацию
export const AuthRoles = (...roles: UserRole[]) => {
    return applyDecorators(
      SetMetadata('roles', roles),
      UseGuards(AuthWithRolesGuard)
    );
  };