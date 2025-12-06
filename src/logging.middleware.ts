import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

// Динамический импорт для поддержки ES модуля chalk 5.x
let chalkInstance: any = null;
const getChalk = async () => {
    if (!chalkInstance) {
        const chalkModule = await import('chalk');
        chalkInstance = chalkModule.default || chalkModule;
    }
    return chalkInstance;
};

// Инициализируем chalk при загрузке модуля
const chalkPromise = getChalk();

// Каждый раз, когда поступает HTTP-запрос, middleware фиксирует метод запроса (например, GET, POST), URL и текущее время.
// Chalk раскрашивает цвет вывода 
@Injectable()
export class LogginMiddleware implements NestMiddleware {
    logger = new Logger('Response')

    constructor() {}

    use(req: Request, res: Response, next: NextFunction) {
        const { method, originalUrl: url } = req;
        const reqTime = new Date().getTime();
        res.on('finish', async () => {
            const { statusCode } = res;
            const resTime = new Date().getTime();
            const logMessage = `${method} ${url} ${statusCode} - ${resTime - reqTime} ms`;

            // Успешный запрос (зеленый)
            if (statusCode === 201 || statusCode === 200) {
                const chalk = await chalkPromise;
                this.logger.log(chalk.cyan(logMessage)); 
            } 
        });
        next();
    }

}