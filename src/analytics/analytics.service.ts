import { Injectable } from '@nestjs/common';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { UserActivityModel } from './user-activity.model';
import { UserModel } from 'src/user/user.model';
import { RedisService } from 'src/redis/redis.service';
import { Types } from 'mongoose';

@Injectable()
export class AnalyticsService {
  // TTL для кэша (1 час)
  private readonly ANALYTICS_CACHE_TTL = 60 * 60;

  constructor(
    @InjectModel(UserActivityModel)
    private readonly UserActivityModel: ModelType<UserActivityModel>,
    @InjectModel(UserModel)
    private readonly UserModel: ModelType<UserModel>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Трекинг активности пользователя
   * Вызывается автоматически middleware при каждом запросе
   */
  async trackUserActivity(userId: Types.ObjectId): Promise<void> {
    console.log('📊 trackUserActivity called for userId:', userId);
    const now = new Date();
    const today = this.getStartOfDay(now);

    try {
      // Обновляем lastActivityDate в UserModel
      console.log('📝 Updating UserModel for userId:', userId);
      const userResult = await this.UserModel.findByIdAndUpdate(
        userId,
        { lastActivityDate: now },
        { new: false }
      ).exec();
      console.log('📝 UserModel updated:', userResult ? 'SUCCESS' : 'USER NOT FOUND');

      // Обновляем или создаем запись активности за сегодня
      console.log('📝 Upserting UserActivityModel for userId:', userId, 'date:', today);
      const activityResult = await this.UserActivityModel.findOneAndUpdate(
        {
          userId: userId,
          date: today,
        },
        {
          $set: {
            lastSeenAt: now,
          },
          $setOnInsert: {
            userId: userId,
            date: today,
            firstSeenAt: now,
          },
          $inc: {
            requestCount: 1,
          },
        },
        {
          upsert: true,
          new: false,
        }
      ).exec();
      console.log('📝 UserActivityModel upserted:', activityResult ? 'UPDATED' : 'CREATED');

      // Инвалидируем кэш для сегодняшней даты
      const cacheKey = `analytics:dau:${this.formatDate(today)}`;
      await this.redisService.del(cacheKey);
      console.log('✅ Activity tracking completed successfully');
    } catch (error) {
      console.error('❌ Error tracking user activity:', error);
      // Не бросаем ошибку, чтобы не ломать основной запрос пользователя
    }
  }

  /**
   * Получить количество уникальных активных пользователей за день (DAU - Daily Active Users)
   */
  async getDailyActiveUsers(date: Date): Promise<number> {
    const startOfDay = this.getStartOfDay(date);
    const cacheKey = `analytics:dau:${this.formatDate(startOfDay)}`;

    // Проверяем кэш
    const cached = await this.redisService.get<string>(cacheKey);
    if (cached !== null) {
      return parseInt(cached, 10);
    }

    // Считаем из БД
    const count = await this.UserActivityModel.countDocuments({
      date: startOfDay,
    }).exec();

    // Кэшируем результат
    await this.redisService.set(cacheKey, count.toString(), this.ANALYTICS_CACHE_TTL);

    return count;
  }

  /**
   * Получить количество уникальных активных пользователей за неделю (WAU - Weekly Active Users)
   */
  async getWeeklyActiveUsers(endDate: Date): Promise<number> {
    const end = this.getStartOfDay(endDate);
    const start = new Date(end);
    start.setDate(start.getDate() - 6); // 7 дней назад

    const cacheKey = `analytics:wau:${this.formatDate(start)}_${this.formatDate(end)}`;

    // Проверяем кэш
    const cached = await this.redisService.get<string>(cacheKey);
    if (cached !== null) {
      return parseInt(cached, 10);
    }

    // Считаем уникальных пользователей за период
    const uniqueUsers = await this.UserActivityModel.distinct('userId', {
      date: { $gte: start, $lte: end },
    }).exec();

    const count = uniqueUsers.length;

    // Кэшируем результат
    await this.redisService.set(cacheKey, count.toString(), this.ANALYTICS_CACHE_TTL);

    return count;
  }

  /**
   * Получить количество уникальных активных пользователей за месяц (MAU - Monthly Active Users)
   */
  async getMonthlyActiveUsers(month: number, year: number): Promise<number> {
    const start = new Date(year, month - 1, 1); // Месяцы в Date начинаются с 0
    const end = new Date(year, month, 0); // Последний день месяца

    const cacheKey = `analytics:mau:${year}-${month}`;

    // Проверяем кэш
    const cached = await this.redisService.get<string>(cacheKey);
    if (cached !== null) {
      return parseInt(cached, 10);
    }

    // Считаем уникальных пользователей за месяц
    const uniqueUsers = await this.UserActivityModel.distinct('userId', {
      date: { $gte: start, $lte: end },
    }).exec();

    const count = uniqueUsers.length;

    // Кэшируем результат (для прошлых месяцев можно кэшировать дольше)
    const now = new Date();
    const isCurrentMonth = now.getMonth() === month - 1 && now.getFullYear() === year;
    const ttl = isCurrentMonth ? this.ANALYTICS_CACHE_TTL : 7 * 24 * 60 * 60; // 1 час или 7 дней

    await this.redisService.set(cacheKey, count.toString(), ttl);

    return count;
  }

  /**
   * Получить количество новых пользователей за день
   */
  async getNewUsersCount(date: Date): Promise<number> {
    const startOfDay = this.getStartOfDay(date);
    const endOfDay = this.getEndOfDay(date);

    const cacheKey = `analytics:new_users:${this.formatDate(startOfDay)}`;

    // Проверяем кэш
    const cached = await this.redisService.get<string>(cacheKey);
    if (cached !== null) {
      return parseInt(cached, 10);
    }

    // Считаем новых пользователей (у которых createdAt в этот день)
    const count = await this.UserModel.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    }).exec();

    // Кэшируем результат
    await this.redisService.set(cacheKey, count.toString(), this.ANALYTICS_CACHE_TTL);

    return count;
  }

  /**
   * Получить статистику по дням за период
   */
  async getDailyStats(startDate: Date, endDate: Date): Promise<DailyStatsDto[]> {
    const start = this.getStartOfDay(startDate);
    const end = this.getStartOfDay(endDate);

    // Агрегация по дням
    const stats = await this.UserActivityModel.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$date',
          uniqueUsers: { $sum: 1 },
          totalRequests: { $sum: '$requestCount' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]).exec();

    return stats.map((stat) => ({
      date: stat._id,
      uniqueUsers: stat.uniqueUsers,
      totalRequests: stat.totalRequests,
    }));
  }

  /**
   * Получить общую статистику
   */
  async getOverallStats(): Promise<OverallStatsDto> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [
      totalUsers,
      dauToday,
      dauYesterday,
      wau,
      mau,
      newUsersToday,
    ] = await Promise.all([
      this.UserModel.countDocuments().exec(),
      this.getDailyActiveUsers(today),
      this.getDailyActiveUsers(yesterday),
      this.getWeeklyActiveUsers(today),
      this.getMonthlyActiveUsers(today.getMonth() + 1, today.getFullYear()),
      this.getNewUsersCount(today),
    ]);

    return {
      totalUsers,
      dau: {
        today: dauToday,
        yesterday: dauYesterday,
        change: dauYesterday > 0 ? ((dauToday - dauYesterday) / dauYesterday) * 100 : 0,
      },
      wau,
      mau,
      newUsersToday,
    };
  }

  /**
   * Получить топ активных пользователей за период
   */
  async getTopActiveUsers(startDate: Date, endDate: Date, limit: number = 10): Promise<TopUserDto[]> {
    const start = this.getStartOfDay(startDate);
    const end = this.getStartOfDay(endDate);

    const topUsers = await this.UserActivityModel.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$userId',
          totalDays: { $sum: 1 },
          totalRequests: { $sum: '$requestCount' },
        },
      },
      {
        $sort: { totalDays: -1, totalRequests: -1 },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          userId: '$_id',
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          username: '$user.username',
          totalDays: 1,
          totalRequests: 1,
        },
      },
    ]).exec();

    return topUsers;
  }

  // Вспомогательные методы

  private getStartOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getEndOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

// DTOs для типизации
export interface DailyStatsDto {
  date: Date;
  uniqueUsers: number;
  totalRequests: number;
}

export interface OverallStatsDto {
  totalUsers: number;
  dau: {
    today: number;
    yesterday: number;
    change: number; // процент изменения
  };
  wau: number;
  mau: number;
  newUsersToday: number;
}

export interface TopUserDto {
  userId: Types.ObjectId;
  firstName: string;
  lastName: string;
  username: string;
  totalDays: number;
  totalRequests: number;
}

