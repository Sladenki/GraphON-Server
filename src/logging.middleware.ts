import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

// ANSI escape коды для цветов (альтернатива chalk, работает без зависимостей)
const colors = {
    cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
    green: (text: string) => `\x1b[32m${text}\x1b[0m`,
    red: (text: string) => `\x1b[31m${text}\x1b[0m`,
};

// Каждый раз, когда поступает HTTP-запрос, middleware фиксирует метод запроса (например, GET, POST), URL и текущее время.
// Цветное логирование через ANSI escape коды
@Injectable()
export class LogginMiddleware implements NestMiddleware {
    logger = new Logger('Response')

    constructor() {}

    use(req: Request, res: Response, next: NextFunction) {
        const { method, originalUrl: url } = req;
        const reqTime = new Date().getTime();
        res.on('finish', () => {
            const { statusCode } = res;
            const resTime = new Date().getTime();
            const logMessage = `${method} ${url} ${statusCode} - ${resTime - reqTime} ms`;

            // Успешный запрос (cyan цвет)
            if (statusCode === 201 || statusCode === 200) {
                this.logger.log(colors.cyan(logMessage)); 
            } 
        });
        next();
    }

}