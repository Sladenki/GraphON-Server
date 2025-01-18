import { Body, Controller, Get, HttpCode, Param, Post, Query, UsePipes, ValidationPipe } from "@nestjs/common";
import { Auth } from "src/decorators/auth.decorator";
import { CurrentUser } from "src/decorators/currentUser.decorator";
import { Types } from "mongoose";
import { PostReactionService } from "./postReaction.service";
import { CreatePostReactionDto } from "./dto/createPostReaction.dto";


@Controller('postReaction')
export class PostReactionController {
  constructor(private readonly postReactionService: PostReactionService) {}

    // Создание реакции на пост 
    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post()
    @Auth()
    async createPost(
        @Body() dto: CreatePostReactionDto
    ) {
        return this.postReactionService.createPostReaction(dto)
    }

    // --- Поиск всех реакций по ID поста ---
    // @Get(':postId')
    // async getReactionsByPostId(
    //     @Body() postId: string
    // ) {
    //     return this.postReactionService.findReactionsByPostId(new Types.ObjectId(postId));
    // }

    // --- Увеличение clickNum на 1 для определенной реакции ---
    @Post(':postId/increment')
    @HttpCode(200)
    @Auth()
    async incrementClickNum(
        @Param('postId') postId: string
    ) {
        return this.postReactionService.incrementClickNum(new Types.ObjectId(postId));
    }

}