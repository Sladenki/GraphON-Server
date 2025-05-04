import { Controller, Patch, Param, Body, UseGuards, Post, HttpCode, UploadedFile, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UserRole } from './role.enum';
import { AuthRoles } from 'src/decorators/auth.decorator';
import { CurrentUser } from 'src/decorators/currentUser.decorator';
import { CreateGraphDto } from 'src/graph/dto/create-graph.dto';
import { Types } from 'mongoose';
import { GraphService } from 'src/graph/graph.service';
import { FileInterceptor } from '@nestjs/platform-express';

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
}
