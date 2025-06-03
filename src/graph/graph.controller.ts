import { Controller, UsePipes, ValidationPipe, HttpCode, Post, Body, Get, Param, Query, UseGuards, UseInterceptors, UploadedFile } from "@nestjs/common";
import { FileInterceptor } from '@nestjs/platform-express';
import { Types } from "mongoose";
import { Auth } from "src/decorators/auth.decorator";
import { CurrentUser } from "src/decorators/currentUser.decorator";
import { OptionalAuth } from "src/decorators/optionalAuth.decorator";
import { GetOptionalAuthContext } from "src/decorators/optional-auth-context.decorator";
import { OptionalAuthGuard } from "src/guards/optionalAuth.guard";
import { JwtAuthGuard } from "../jwt/jwt-auth.guard";
import { CreateGraphDto } from "./dto/create-graph.dto";
import { GraphService } from "./graph.service";
import { OptionalAuthContext } from "../interfaces/optional-auth.interface";
import { Express } from 'express';

@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  // --- Создание графа --- 
  // @UsePipes(new ValidationPipe())
  // @HttpCode(200)
  // @Post()
  // @Auth()
  // @UseInterceptors(FileInterceptor('image'))
  // async createGraph(
  //   @CurrentUser('_id') userId: Types.ObjectId,
  //   @Body() dto: CreateGraphDto,
  //   @UploadedFile() image: Express.Multer.File
  // ) {
  //   return this.graphService.createGraph(dto, userId, image)
  // }

  // --- Получение графа по id ---
  @Get('getById/:id')
  async getGraphById(
      @Param('id') id:string
  ) {
    return this.graphService.getGraphById(new Types.ObjectId(id))
  }

  // --- Получение главных родительских графов --- 
  @Get('getParentGraphs')
  @UseGuards(JwtAuthGuard, OptionalAuthGuard)
  @OptionalAuth()
  async getParentGraphs(
    @Query('skip') skip,
    @GetOptionalAuthContext() authContext: OptionalAuthContext,
  ) {
    return this.graphService.getParentGraphs(skip, authContext.userId)
  }

  // --- Получение всех дочерних графов по Id родительскому --- 
  @Get('getAllChildrenGraphs/:parentGraphId')
  @UseGuards(JwtAuthGuard, OptionalAuthGuard)
  @OptionalAuth()
  async getAllChildrenGraphs(
    @Param('parentGraphId') parentGraphId: string,
    @Query('skip') skip,
    @GetOptionalAuthContext() authContext: OptionalAuthContext,
  ) {
    return this.graphService.getAllChildrenGraphs(new Types.ObjectId(parentGraphId), skip, authContext.userId)
  }

  // --- Получение графов-тематик ---
  @Get('getTopicGraphs/:parentGraphId')
  async getTopicGraphs(
    @Param('parentGraphId') parentGraphId: string,
  ) {
    return this.graphService.getTopicGraphs(new Types.ObjectId(parentGraphId))
  }

  // --- Получение всех глобальных графов ---
  @Get('getGlobalGraphs')
  async getGlobalGraphs() {
    return this.graphService.getGlobalGraphs();
  }

}