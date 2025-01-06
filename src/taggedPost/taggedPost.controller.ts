import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { CreateTaggedPostDto } from "./dto/create-taggedPost";
import { TaggedPostService } from "./taggedPost.service";

@Controller('taggedPost') 
export class TaggedPostController {
    constructor(private readonly taggedPostService: TaggedPostService) {}

    // Создание связи между тегов и публикации 
    @HttpCode(200)
    @Post()
    async createTaggedPost(
        @Body() dto: CreateTaggedPostDto
    ) {
        return this.taggedPostService.createTaggedPost(dto.postId, dto.postTag)
    }
    
}