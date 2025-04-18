// src/role-management/role-management.controller.ts
import { Controller, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UserRole } from './role.enum';
import { Roles } from 'src/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/user/jwt-auth.guard';
import { Auth, AuthRoles } from 'src/decorators/auth.decorator';



@Controller('admin')

export class AdminController {
  constructor(private readonly adminService: AdminService) {}

    // --- Передача роли --- 
    @AuthRoles(UserRole.Create)
    @Patch('assignRole/:id')
    assignRole(
        @Param('id') userId: string, 
        @Body('role') role: UserRole
    ) {
        console.log('userId', userId, 'role', role)
        return this.adminService.assignRole(userId, role);
    }
}
