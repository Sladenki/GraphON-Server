import { Controller, UsePipes, ValidationPipe, HttpCode, Post, Body, Get, Param, Query } from "@nestjs/common";
import { Types } from "mongoose";
import { Auth } from "src/decorators/auth.decorator";
import { CurrentUser } from "src/decorators/currentUser.decorator";
import { CreateGraphDto } from "./dto/create-graph.dto";
import { GraphService } from "./graph.service";

@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  // --- Создание графа --- 
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Post()
  @Auth()
  async createGraph(
    @CurrentUser('_id') userId: Types.ObjectId,
    @Body() dto: CreateGraphDto
  ) {
     return this.graphService.createGraph(dto, userId)
  }

  // --- Получение графа по id ---
  @Get('getById/:id')
  async getGraphById(
      @Param('id') id:string
  ) {
    return this.graphService.getGraphById(new Types.ObjectId(id))
  }

  // --- Получение главных родительских графов --- 
  @Get('getParentGraphs')
  async getParentGraphs(
    @Query('skip') skip,
  ) {
    return this.graphService.getParentGraphs(skip)
  }

  // --- Получение главных родительских графов для авторизованных пользователей--- 
  @Get('getParentGraphsAuth')
  @Auth()
  async getParentGraphsAuth(
    @Query('skip') skip,
    @CurrentUser('_id') userId: Types.ObjectId,
  ) {
    return this.graphService.getParentGraphsAuth(skip, userId)
  }

  // --- Получение всех дочерних графов по Id родительскому --- 
  @Get('getAllChildrenGraphs/:parentGraphId')
  async getAllChildrenGraphs(
    @Param('parentGraphId') parentGraphId: string
  ) {
    return this.graphService.getAllChildrenGraphs(new Types.ObjectId(parentGraphId))
    }


}