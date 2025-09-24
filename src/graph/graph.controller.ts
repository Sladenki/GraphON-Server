import { Controller, UsePipes, ValidationPipe, HttpCode, Post, Body, Get, Param, Query, UseGuards, UseInterceptors, UploadedFile, Delete } from "@nestjs/common";
import { FileInterceptor } from '@nestjs/platform-express';
import { Types } from "mongoose";
import { OptionalAuth } from "src/decorators/optionalAuth.decorator";
import { GetOptionalAuthContext } from "src/decorators/optional-auth-context.decorator";
import { OptionalAuthGuard } from "src/guards/optionalAuth.guard";
import { JwtAuthGuard } from "../jwt/jwt-auth.guard";
import { CreateGraphDto } from "./dto/create-graph.dto";
import { GraphService } from "./graph.service";
import { OptionalAuthContext } from "../interfaces/optional-auth.interface";
import { Express } from 'express';
import { Auth } from "src/decorators/auth.decorator";
import { CurrentUser } from "src/decorators/currentUser.decorator";

@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

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

  // --- Получение всех дочерних графов по Id глобального графа --- 
  @Get('getAllChildrenByGlobal/:globalGraphId')
  async getAllChildrenByGlobal(
    @Param('globalGraphId') globalGraphId: string,
  ) {
    return this.graphService.getAllChildrenByGlobal(new Types.ObjectId(globalGraphId))
  }

  // --- Получение всех дочерних графов по Id родительского графа-тематики - Для системы графов --- 
  @Get('getAllChildrenByTopic/:parentGraphId')
  async getAllChildrenByTopic(
    @Param('parentGraphId') parentGraphId: string,
  ) {
    return this.graphService.getAllChildrenByTopic(new Types.ObjectId(parentGraphId))
  }

  // --- Получение графов-тематик ---
  @Get('getTopicGraphs/:parentGraphId')
  async getTopicGraphs(
    @Param('parentGraphId') parentGraphId: string,
  ) {
    return this.graphService.getTopicGraphs(new Types.ObjectId(parentGraphId))
  }

  // --- Получение глобального графа с его графами-тематиками ---
  @Get('getTopicGraphsWithGlobal/:globalGraphId')
  async getTopicGraphsWithMain(
    @Param('globalGraphId') globalGraphId: string,
  ) {
    return this.graphService.getTopicGraphsWithMain(new Types.ObjectId(globalGraphId));
  }

  // --- Получение всех глобальных графов ---
  @Get('getGlobalGraphs')
  async getGlobalGraphs() {
    return this.graphService.getGlobalGraphs();
  }

  // --- Удаление графа с каскадным удалением подписок ---
  @Delete(':id')
  @Auth()
  async deleteGraph(
    @Param('id') id: string,
    @CurrentUser('_id') requesterId: Types.ObjectId,
  ) {
    return this.graphService.deleteGraph(new Types.ObjectId(id), requesterId);
  }



}