import { Controller, Patch, Param, Body, UseGuards, Post, HttpCode, UploadedFile, UseInterceptors, UsePipes, ValidationPipe, Get } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UserRole } from './role.enum';
import { AuthRoles } from 'src/decorators/auth.decorator';
import { CurrentUser } from 'src/decorators/currentUser.decorator';
import { CreateGraphDto } from 'src/graph/dto/create-graph.dto';
import { Types } from 'mongoose';
import { GraphService } from 'src/graph/graph.service';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { CreateGlobalGraphDto } from 'src/graph/dto/create-global-graph.dto';
import { CreateTopicGraphDto } from 'src/graph/dto/create-topic-graph.dto';
import { UserService } from 'src/user/user.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly graphService: GraphService,
    private readonly userService: UserService
) {}

    // --- Передача роли --- 
    @AuthRoles(UserRole.Admin)
    @Patch('assignRole/:id')
    assignRole(
        @Param('id') userId: string, 
        @Body('role') role: UserRole
    ) {
        return this.adminService.assignRole(userId, role);
    }

    // --- Создание глобального графа ---
    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @AuthRoles(UserRole.Create)
    @Post('createGlobalGraph')
    @UseInterceptors(FileInterceptor('image'))
    createGlobalGraph(
        @Body() dto: CreateGlobalGraphDto,
        @CurrentUser('_id') userId: Types.ObjectId,
        @UploadedFile() image: Express.Multer.File
    ) {
        return this.graphService.createGlobalGraph(dto, userId, image);
    }

    // --- Создание графа-тематики ---
    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @AuthRoles(UserRole.Create)
    @Post('createTopicGraph')
    @UseInterceptors(FileInterceptor('image'))
    createTopicGraph(
        @Body() dto: CreateTopicGraphDto,
        @CurrentUser('_id') userId: Types.ObjectId,
        @UploadedFile() image: Express.Multer.File
    ) {
        return this.graphService.createTopicGraph(dto, userId, image);
    }

    // --- Создание графа --- 
    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @AuthRoles(UserRole.Editor)
    @Post('createGraph')
    @UseInterceptors(FileInterceptor('image'))
    createGraph(
        @Body() dto: CreateGraphDto,
        @CurrentUser('_id') userId: Types.ObjectId,
        @UploadedFile() image: Express.Multer.File
    ) {
        return this.graphService.createGraph(dto, userId, image)
    }

    // --- Передача прав администратора графа ---
    @AuthRoles(UserRole.Admin)
    @Patch('transferGraphOwnership/:graphId')
    transferGraphOwnership(
        @Param('graphId') graphId: string,
        @Body('newOwnerId') newOwnerId: string
    ) {
        return this.adminService.transferGraphOwnership(graphId, newOwnerId);
    }

    // --- Получение статистики приложения ---
    @AuthRoles(UserRole.Create)
    @Get('user-stats')
    getApplicationStats() {
        return this.adminService.getApplicationStats();
    }

    // --- Получение статистики использования ресурсов сервера ---
    @AuthRoles(UserRole.SysAdmin)
    @Get('server-stats')
    getServerResourceStats() {
        return this.adminService.getServerResourceStats();
    }

    // --- Триггер бэкофила managedGraphIds у пользователей ---
    @AuthRoles(UserRole.Create)
    @Post('backfill-managed-graphs')
    backfillManagedGraphs() {
        return this.userService.backfillManagedGraphs();
    }



}
