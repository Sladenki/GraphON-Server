import { ExecutionContext } from "@nestjs/common"
import { createParamDecorator } from "@nestjs/common/decorators"
import { Types } from "mongoose"
import { UserModel } from "src/user/user.model"

// Получаем текущего пользователя
export const CurrentUser = createParamDecorator(
    (data: keyof UserModel, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest()
        // console.log('request.user', request.user)
        const user = request.user
      
        const objectId = new Types.ObjectId(user.sub); 
        return objectId;
    }
)

export const OptionalCurrentUser = createParamDecorator(
    (data: keyof UserModel, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest()
        // console.log('request.user', request.user)
        const user = request.user

        // Возвращаем undefined, если пользователь не авторизован - нужно когда используем OptionalAuth
        if (!user) {
            return undefined;
        }
      
        // return data ? user[data] : user;

        const objectId = new Types.ObjectId(user.sub); 
        return objectId;
    }
)

