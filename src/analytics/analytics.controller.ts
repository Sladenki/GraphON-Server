import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthRoles } from 'src/decorators/auth.decorator';
import { UserRole } from 'src/admin/role.enum';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Получить общую статистику (DAU, WAU, MAU, новые пользователи)
  @AuthRoles(UserRole.Create)
  @Get('overall')
  async getOverallStats() {
    return this.analyticsService.getOverallStats();
  }

  // Получить DAU (Daily Active Users) за конкретный день
  @AuthRoles(UserRole.Create)
  @Get('dau')
  async getDailyActiveUsers(@Query('date') dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const count = await this.analyticsService.getDailyActiveUsers(date);
    return {
      date: date.toISOString().split('T')[0],
      dau: count,
    };
  }

  // Получить WAU (Weekly Active Users) за неделю до указанной даты
  @AuthRoles(UserRole.Create)
  @Get('wau')
  async getWeeklyActiveUsers(@Query('date') dateStr?: string) {
    const endDate = dateStr ? new Date(dateStr) : new Date();
    const count = await this.analyticsService.getWeeklyActiveUsers(endDate);
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      wau: count,
    };
  }

  // Получить MAU (Monthly Active Users) за месяц
  @AuthRoles(UserRole.Create)
  @Get('mau')
  async getMonthlyActiveUsers(
    @Query('month', ParseIntPipe) month?: number,
    @Query('year', ParseIntPipe) year?: number,
  ) {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const count = await this.analyticsService.getMonthlyActiveUsers(targetMonth, targetYear);
    
    return {
      month: targetMonth,
      year: targetYear,
      mau: count,
    };
  }

  // Получить количество новых пользователей за день
  @AuthRoles(UserRole.Create)
  @Get('new-users')
  async getNewUsers(@Query('date') dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const count = await this.analyticsService.getNewUsersCount(date);
    
    return {
      date: date.toISOString().split('T')[0],
      newUsers: count,
    };
  }

  // Получить статистику по дням за период
  @AuthRoles(UserRole.Create)
  @Get('daily-stats')
  async getDailyStats(
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr?: string,
  ) {
    const startDate = new Date(startDateStr);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    const stats = await this.analyticsService.getDailyStats(startDate, endDate);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      stats,
    };
  }

  // Получить топ активных пользователей за период
  @AuthRoles(UserRole.Create)
  @Get('top-users')
  async getTopUsers(
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr?: string,
    @Query('limit', ParseIntPipe) limit?: number,
  ) {
    const startDate = new Date(startDateStr);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    const topLimit = limit || 10;

    const topUsers = await this.analyticsService.getTopActiveUsers(startDate, endDate, topLimit);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      topUsers,
    };
  }
}

