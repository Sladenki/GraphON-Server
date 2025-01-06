import { UseGuards } from "@nestjs/common";
// import { AuthGuard } from "@nestjs/passport";
import { OptionalAuthGuard } from "./OptionalAuthGuard";
import { AuthGuard } from "src/auth/auth.guard";

// Принимаем запросы только от авторизированных пользователей
// export const Auth = () => UseGuards(AuthGuard('jwt'))
export const Auth = () => UseGuards(AuthGuard)

// Принимаем запросы от авторизированных пользователей и неавторизированных (т.к не возвращаем ошибку)
export const OptionalAuth = () => UseGuards(OptionalAuthGuard);