import { forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { GraphSubsModel, GraphSubsDocument } from './graphSubs.model';
import { EventRegsModel, EventRegsDocument } from 'src/eventRegs/eventRegs.model';
import { Types } from 'mongoose';
import { ScheduleService } from 'src/schedule/schedule.service';
import { GraphModel, GraphDocument } from 'src/graph/graph.model';
import { EventService } from 'src/event/event.service';
import { EventRegsService } from 'src/eventRegs/eventRegs.service';
import { UserModel, UserDocument } from 'src/user/user.model';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class GraphSubsService {
  constructor(
    @InjectModel(GraphSubsModel.name)
    private readonly graphSubsModel: Model<GraphSubsDocument>,

    @InjectModel(GraphModel.name)
    private readonly graphModel: Model<GraphDocument>,

    @InjectModel(UserModel.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(EventRegsModel.name)
    private readonly eventRegsModel: Model<EventRegsDocument>,

    private readonly scheduleService: ScheduleService,
    private readonly eventService: EventService,
    private readonly eventRegsService: EventRegsService,
    private readonly redisService: RedisService
  ) {}

  // --- Инвалидация кэша подписок пользователя ---
  private async invalidateUserSubscriptionsCache(userId: string | Types.ObjectId): Promise<void> {
    const cacheKey = `userSubs:${userId.toString()}`;
    await this.redisService.del(cacheKey);
    console.log(`🗑️ Redis CACHE INVALIDATED: ${cacheKey}`);
  }

  // --- Инвалидация кэша графа ---
  private async invalidateGraphCache(graphId: string | Types.ObjectId): Promise<void> {
    // Инвалидируем кэш конкретного графа
    const graphCacheKey = `graph:getGraphById:{"id":"${graphId.toString()}"}`;
    await this.redisService.del(graphCacheKey);
    console.log(`🗑️ Redis GRAPH CACHE INVALIDATED: ${graphCacheKey}`);
    
    // Инвалидируем все кэши списков графов, которые могут содержать обновленную информацию
    await this.redisService.delPattern('graph:getParentGraphs:*');
    await this.redisService.delPattern('graph:getGlobalGraphs:*');
    console.log(`🗑️ Redis GRAPH LISTS CACHE INVALIDATED: All graph lists`);
  }

  // --- Переключение подписки на граф ---
  async toggleSub(user: string | Types.ObjectId, graph: string | Types.ObjectId): Promise<{ subscribed: boolean }> {
    // Преобразуем параметры в ObjectId для корректного поиска в БД
    const userObjectId = typeof user === 'string' ? new Types.ObjectId(user) : user;
    const graphObjectId = typeof graph === 'string' ? new Types.ObjectId(graph) : graph;
    
    const session = await this.graphSubsModel.db.startSession();
    
    try {
      return await session.withTransaction(async () => {
        // Используем findOneAndDelete для атомарной операции
        const deletedSub = await (this.graphSubsModel.findOneAndDelete as any)({ 
          user: userObjectId, 
          graph: graphObjectId 
        })
          .session(session)
          .lean()
          .exec();

        if (deletedSub) {
          // Подписка была удалена - уменьшаем счетчики
          await Promise.all([
            this.graphModel.findByIdAndUpdate(
              graphObjectId,
              { $inc: { subsNum: -1 } },
              { session, lean: true }
            ).exec(),
            this.userModel.findByIdAndUpdate(
              userObjectId,
              { $inc: { graphSubsNum: -1 } },
              { session, lean: true }
            ).exec()
          ]);
          
          // Инвалидируем кэш подписок пользователя и графа
          await Promise.all([
            this.invalidateUserSubscriptionsCache(userObjectId),
            this.invalidateGraphCache(graphObjectId)
          ]);
          
          return { subscribed: false };
        } else {
          // Подписки не было - создаем и увеличиваем счетчики
          await Promise.all([
            (this.graphSubsModel.create as any)([{ user: userObjectId, graph: graphObjectId }], { session }),
            (this.graphModel.findByIdAndUpdate as any)(
              graphObjectId,
              { $inc: { subsNum: 1 } },
              { session, lean: true }
            ).exec(),
            (this.userModel.findByIdAndUpdate as any)(
              userObjectId,
              { $inc: { graphSubsNum: 1 } },
              { session, lean: true }
            ).exec()
          ]);
          
          // Инвалидируем кэш подписок пользователя и графа
          await Promise.all([
            this.invalidateUserSubscriptionsCache(userObjectId),
            this.invalidateGraphCache(graphObjectId)
          ]);
          
          return { subscribed: true };
        }
      });
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Ошибка при переключении подписки');
    } finally {
      await session.endSession();
    }
  }

  /**
   * Альтернативная версия для MongoDB 3.x без транзакций.
   * 
   * Особенности:
   * - НЕ использует session/transactions.
   * - Сначала проверяет, есть ли подписка.
   * - При подписке: сначала обновляет счетчики, потом создаёт документ.
   *   В случае ошибки при создании документа счётчики откатываются.
   * - При отписке: сначала удаляет документ, потом обновляет счётчики,
   *   при ошибке попытка откатить (вставить документ обратно).
   * 
   * ВАЖНО: это "best effort" без гарантий атомарности, но
   * не оставляет "висящего" документа при ошибке.
   */
  async graphSubsTempMongo(user: string | Types.ObjectId, graph: string | Types.ObjectId): Promise<{ subscribed: boolean }> {
    const userObjectId = typeof user === 'string' ? new Types.ObjectId(user) : user;
    const graphObjectId = typeof graph === 'string' ? new Types.ObjectId(graph) : graph;

    try {
      // Проверяем, есть ли уже подписка
      const existing = await (this.graphSubsModel.findOne as any)({
        user: userObjectId,
        graph: graphObjectId,
      }).lean().exec();

      if (existing) {
        // --- ОТПИСКА ---
        // 1) Пытаемся удалить документ подписки
        const deleteResult = await (this.graphSubsModel.deleteOne as any)({
          user: userObjectId,
          graph: graphObjectId,
        }).exec();

        if (deleteResult.deletedCount === 0) {
          // Документ не удалился — считаем, что подписки нет, ничего не делаем
          return { subscribed: false };
        }

        try {
          // 2) Обновляем счётчики
          await Promise.all([
            this.graphModel.findByIdAndUpdate(
              graphObjectId,
              { $inc: { subsNum: -1 } },
              { lean: true }
            ).exec(),
            this.userModel.findByIdAndUpdate(
              userObjectId,
              { $inc: { graphSubsNum: -1 } },
              { lean: true }
            ).exec(),
          ]);
        } catch (error) {
          // Пытаемся откатить удаление подписки, чтобы не потерять связь
          try {
            await (this.graphSubsModel.create as any)({
              user: userObjectId,
              graph: graphObjectId,
            });
          } catch (rollbackError) {
            console.error('graphSubsTempMongo rollback (recreate sub) failed:', rollbackError);
          }

          throw new InternalServerErrorException('Ошибка при обновлении счётчиков при отписке');
        }

        // Инвалидируем кэш
        await Promise.all([
          this.invalidateUserSubscriptionsCache(userObjectId),
          this.invalidateGraphCache(graphObjectId),
        ]);

        return { subscribed: false };
      } else {
        // --- ПОДПИСКА ---
        // 1) Сначала обновляем счётчики
        try {
          await Promise.all([
            this.graphModel.findByIdAndUpdate(
              graphObjectId,
              { $inc: { subsNum: 1 } },
              { lean: true }
            ).exec(),
            this.userModel.findByIdAndUpdate(
              userObjectId,
              { $inc: { graphSubsNum: 1 } },
              { lean: true }
            ).exec(),
          ]);
        } catch (error) {
          throw new InternalServerErrorException('Ошибка при обновлении счётчиков при подписке');
        }

        // 2) Затем создаём документ подписки
        try {
          await (this.graphSubsModel.create as any)({
            user: userObjectId,
            graph: graphObjectId,
          });
        } catch (error) {
          // Откатываем ранее увеличенные счётчики
          try {
            await Promise.all([
              this.graphModel.findByIdAndUpdate(
                graphObjectId,
                { $inc: { subsNum: -1 } },
                { lean: true }
              ).exec(),
              this.userModel.findByIdAndUpdate(
                userObjectId,
                { $inc: { graphSubsNum: -1 } },
                { lean: true }
              ).exec(),
            ]);
          } catch (rollbackError) {
            console.error('graphSubsTempMongo rollback (counters) failed:', rollbackError);
          }

          throw new InternalServerErrorException('Ошибка при создании подписки');
        }

        // Инвалидируем кэш
        await Promise.all([
          this.invalidateUserSubscriptionsCache(userObjectId),
          this.invalidateGraphCache(graphObjectId),
        ]);

        return { subscribed: true };
      }
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      console.error('Error in graphSubsTempMongo:', error);
      throw new InternalServerErrorException('Ошибка при переключении подписки (режим MongoDB 3.x)');
    }
  }

  // --- Получение расписания из подписанных графов ---
  // --- Для страницы расписания - стабильное расписание и записанные мероприяти ---
  async getSubsSchedule(userId: Types.ObjectId, daysAhead: number = 30) {
    try {
      // Быстро получаем ID подписанных графов (упрощенный aggregate)
      const subscribedGraphs = await (this.graphSubsModel.find as any)({ user: userId })
        .select('graph')
        .lean()
        .exec();
      
      const subscribedGraphIds = [...new Set(subscribedGraphs.map(sub => sub.graph))];

      // Теперь параллельно получаем расписание и события
      const [schedule, userEvents] = await Promise.all([
        subscribedGraphIds.length > 0 
          ? this.scheduleService.getWeekdaySchedulesByGraphs(
              subscribedGraphIds.map(id => id.toString())
            )
          : Promise.resolve([]),
        this.eventRegsService.getEventsByUserId(userId, daysAhead)
      ]);

      // Упрощенная обработка событий
      const mergedEvents = userEvents.map((reg: any) => ({
        ...reg.eventId,
        isAttended: true
      }));

      return {
        schedule,
        events: mergedEvents
      };
    } catch (error) {
      console.error('Error in getSubsSchedule:', error);
      throw new InternalServerErrorException('Ошибка при получении расписания подписок');
    }
  }

  // --- Подписки ---
  // --- Получение событий из подписок ---
  async getSubsEvents(userId: string | Types.ObjectId) {
    // Преобразуем userId в ObjectId для корректного поиска в БД
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    
    // Оптимизированный подход: параллельно получаем все необходимые данные
    const [subscribedGraphs, userEventRegs] = await Promise.all([
      // Получаем подписанные графы пользователя
      this.graphSubsModel.aggregate([
        { $match: { user: userObjectId } },
        { $group: { _id: '$graph' } },
        { $project: { _id: 1 } }
      ]).exec(),
      
      // Получаем все записи пользователя на события одним запросом
      (this.eventRegsModel.find as any)({ userId: userObjectId })
        .select('eventId')
        .lean()
        .exec()
    ]);

    // Преобразуем ObjectId в строки для передачи в getEventsByGraphsIds
    // (метод сам преобразует их обратно в ObjectId)
    const graphIds = subscribedGraphs?.length > 0 
      ? subscribedGraphs.map(graph => graph._id.toString()) 
      : [];

    if (graphIds.length === 0) {
      return [];
    }

    // Получаем события из подписанных графов
    const events = await this.eventService.getEventsByGraphsIds(graphIds);

    // Создаем Set для быстрого поиска записей на события
    const attendedEventIds = new Set(
      userEventRegs.map(reg => reg.eventId.toString())
    );

    // Добавляем поле isAttended к каждому событию
    const eventsWithAttendance = events.map(event => ({
      ...event,
      isAttended: attendedEventIds.has(event._id.toString())
    }));

    return eventsWithAttendance;
  }


  // --- Получение всех групп, на которые подписан пользователь ---
  async getUserSubscribedGraphs(userId: Types.ObjectId) {
    try {
      const subscribedGraphs = await (this.graphSubsModel.find as any)({ user: userId })
        .populate({
          path: 'graph',
          select: 'name about imgPath ownerUserId'
        })
        .lean()
        .exec();

      return subscribedGraphs.map(sub => ({
        ...sub.graph,
        isSubscribed: true
      }));
    } catch (error) {
      console.error('Error in getUserSubscribedGraphs:', error);
      throw new InternalServerErrorException('Ошибка при получении подписанных групп');
    }
  }

  // --- Получение всех подписчиков графа по его ID ---
  async getGraphSubscribers(graphId: Types.ObjectId) {
    try {
      const subscribers = await (this.graphSubsModel.find as any)({ graph: graphId })
        .populate({
          path: 'user',
          select: 'firstName lastName username avaPath telegramId'
        })
        .sort({ createdAt: -1 }) // Новые подписчики сначала
        .lean()
        .exec();

      return subscribers.map(sub => ({
        ...sub.user,
        subscribedAt: sub.createdAt
      }));
    } catch (error) {
      console.error('Error in getGraphSubscribers:', error);
      throw new InternalServerErrorException('Ошибка при получении подписчиков графа');
    }
  }

  // --- Проверка подписки на граф ---
  // --- Нужна для гланой страницы для отображения подписок пользователя ---
  async isUserSubsExists(graph: string, userId: string): Promise<boolean> {
    try {
      // Используем select только нужных полей и lean() для оптимизации
      const exists = await this.graphSubsModel
        .findOne(
          {
            graph: new Types.ObjectId(graph),
            user: new Types.ObjectId(userId),
          } as any,
          { _id: 1 } // Выбираем только ID для оптимизации
        )
        .lean() // Возвращаем простой объект вместо документа Mongoose
        .exec();

      return !!exists;
    } catch (error) {
      console.error('Error in isUserSubsExists:', error);
      return false;
    }
  }

}
