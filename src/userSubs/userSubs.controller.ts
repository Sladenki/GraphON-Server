import { Controller, HttpCode, Param, Patch, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";

import { Types } from "mongoose";
import { UserSubsService } from "./userSubs.service";
import { Auth } from "src/decorators/auth.decorator";
import { CurrentUser } from "src/decorators/currentUser.decorator";


@Controller('UserSubs') 
export class UserSubsController {
    constructor(private readonly userSubsService: UserSubsService) {}

    // Подписка (отписка) на пользователя
    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Patch(':subscribed')
    @Auth() 
    async toggleSubs(
        @CurrentUser('_id') currentUserId: Types.ObjectId,
        @Param('subscribed') subToUserId: Types.ObjectId,
    ) {
        return this.userSubsService.toggleSubs(currentUserId, subToUserId)
    }




}