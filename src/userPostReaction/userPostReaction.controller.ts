import { BadRequestException, Body, Controller, Get, HttpCode, Post, Query, UsePipes, ValidationPipe } from "@nestjs/common";
import { Auth } from "src/decorators/auth.decorator";
import { UserPostReactionService } from "./userPostReaction.service";
import { CurrentUser } from "src/decorators/currentUser.decorator";
import { Types } from "mongoose";


@Controller('userPostReactionPost')
export class UserPostReactionController {
  constructor(private readonly userPostReactionPostService: UserPostReactionService) {}

    // --- Связываем пользователя и реакцию ---
    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post()
    @Auth()
    async createUserAndReactionConnection(
        @CurrentUser('_id') userId: Types.ObjectId,
        @Body() dto: {reactionId: string, postId: string, isReacted: boolean}
    ) {
        console.log('dto', dto, userId)
        return this.userPostReactionPostService.createUserAndReactionConnection(
            userId,
            dto.reactionId,
            dto.postId,
            dto.isReacted
        )   
    }

    // Проверка, поставил ли пользователь реакцию
    @Get('checkUserReaction')
    async checkUserReaction(
        @Body() dto: {reactionId: string, userId: string}
    ){
        return this.userPostReactionPostService.isUserReactionExists(
            dto.reactionId,
            dto.userId,
        );
    }

}