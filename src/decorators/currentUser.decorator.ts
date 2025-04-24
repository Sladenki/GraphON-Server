import { ExecutionContext } from "@nestjs/common"
import { createParamDecorator } from "@nestjs/common/decorators"
import { Types } from "mongoose"
import { UserModel } from "src/user/user.model"

// Получаем текущего пользователя
export const CurrentUser = createParamDecorator(
    (data: keyof UserModel, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest()
        const user = request.user
        if (!user) return undefined;
        
        if (data === '_id') {
            return new Types.ObjectId(user.sub);
        }
        return data ? user[data] : user;
    }
)



