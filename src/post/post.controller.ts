import { Body, Controller, Get, HttpCode, Post, Query, UploadedFile, UseGuards, UseInterceptors, UsePipes, ValidationPipe } from "@nestjs/common";
import { PostService } from "./post.service";
import { Auth, OptionalAuth } from "src/decorators/auth.decorator";
import { CurrentUser, OptionalCurrentUser } from "src/decorators/currentUser.decorator";
import { Types } from "mongoose";
import { CreatePostDto } from "./dto/create-post.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "@nestjs/passport";

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

    // Получение всех постов 
    @Get('getPosts')
    @OptionalAuth()
    async getAllPostsWithInfo(
      @Query('skip') skip,
      @OptionalCurrentUser('_id') userId?: Types.ObjectId,
    ) {
      return this.postService.getPosts(skip, userId)
    }

    // Создание поста 
    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post('create')
    @Auth()
    @UseInterceptors(FileInterceptor('imgPath'))
    async createPost(
      @CurrentUser('_id') userId: Types.ObjectId,
      @Body() dto: CreatePostDto,
      @UploadedFile() imgPath: any,
    ) {
      console.log('createPost', userId, dto, imgPath)
      dto.imgPath = imgPath;
      return this.postService.createPost(dto, userId)
    }


}