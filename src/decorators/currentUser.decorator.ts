import { ExecutionContext } from "@nestjs/common"
import { createParamDecorator } from "@nestjs/common/decorators"
import { Types } from "mongoose"
import { UserModel } from "src/user/user.model"

// Получаем текущего пользователя
export const CurrentUser = createParamDecorator(
    (data: keyof UserModel, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest()
        const user = request.user
      
        const objectId = new Types.ObjectId(user.sub); 
        return objectId;
    }
)



