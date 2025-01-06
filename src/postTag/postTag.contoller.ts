import { Body, Controller, HttpCode, Post } from "@nestjs/common";

import { PostTagService } from "./postTag.service";


@Controller('postTag') 
export class PostTagController {
    constructor(private readonly postTagService: PostTagService) {}

    // Создание тега от публикации 
    @HttpCode(200)
    @Post()
    async createPostTag(
        @Body() name: string[]
    ) {
        return this.postTagService.createPostTag(name)
    }
    
}