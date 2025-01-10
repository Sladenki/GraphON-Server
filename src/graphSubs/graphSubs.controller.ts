import { Body, Controller, HttpCode, Param, Patch, Post, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";

import { Types } from "mongoose";
import { Auth } from "src/decorators/auth.decorator";
import { CurrentUser } from "src/decorators/currentUser.decorator";
import { GraphSubsService } from "./graphSubs.service";


@Controller('graphSubs') 
export class GraphSubsController {
    constructor(private readonly graphSubsService: GraphSubsService) {}

    // Подписка (отписка) на граф
    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post()
    @Auth() 
    async toggleSub(
        @CurrentUser('_id') currentUserId: Types.ObjectId,
        @Body() graphId: string,
    ) {
        console.log('toggleSub', currentUserId, graphId)
        return this.graphSubsService.toggleSub(currentUserId, graphId)
    }

}