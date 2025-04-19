import { Controller, Patch, Param, Body, UseGuards, Post } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UserRole } from './role.enum';
import { AuthRoles } from 'src/decorators/auth.decorator';
import { CurrentUser } from 'src/decorators/currentUser.decorator';
import { CreateGraphDto } from 'src/graph/dto/create-graph.dto';
import { Types } from 'mongoose';
import { GraphService } from 'src/graph/graph.service';

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
    @AuthRoles(UserRole.Editor)
    @Post('createGraph')
    createGraph(
        @Body() dto: CreateGraphDto,
        @CurrentUser('_id') userId: Types.ObjectId,
    ) {
        return this.graphService.createGraph(dto, userId)
    }
}
