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

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly graphService: GraphService
) {}

    // --- Передача роли --- 
    @AuthRoles(UserRole.Create)
    @Patch('assignRole/:id')
    assignRole(
        @Param('id') userId: string, 
        @Body('role') role: UserRole
    ) {
        return this.adminService.assignRole(userId, role);
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
    @AuthRoles(UserRole.Create)
    @Get('server-stats')
    getServerResourceStats() {
        return this.adminService.getServerResourceStats();
    }
}
