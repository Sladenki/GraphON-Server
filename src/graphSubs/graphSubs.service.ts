import { forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { GraphSubsModel } from './graphSubs.model';
import { EventRegsModel } from 'src/eventRegs/eventRegs.model';
import { Types } from 'mongoose';
import { ScheduleService } from 'src/schedule/schedule.service';
import { GraphModel } from 'src/graph/graph.model';
import { EventService } from 'src/event/event.service';
import { EventRegsService } from 'src/eventRegs/eventRegs.service';
import { UserModel } from 'src/user/user.model';

@Injectable()
export class GraphSubsService {
  constructor(
    @InjectModel(GraphSubsModel)
    private readonly graphSubsModel: ModelType<GraphSubsModel>,

    @InjectModel(GraphModel)
    private readonly GraphModel: ModelType<GraphModel>,

    @InjectModel(UserModel)
    private readonly UserModel: ModelType<UserModel>,

    @InjectModel(EventRegsModel)
    private readonly eventRegsModel: ModelType<EventRegsModel>,

    private readonly scheduleService: ScheduleService,
    private readonly eventService: EventService,
    private readonly eventRegsService: EventRegsService
  ) {}

  // --- Переключение подписки на граф ---
  async toggleSub(user: string | Types.ObjectId, graph: string | Types.ObjectId): Promise<{ subscribed: boolean }> {
    const session = await this.graphSubsModel.db.startSession();
    
    try {
      return await session.withTransaction(async () => {
        // Используем findOneAndDelete для атомарной операции
        const deletedSub = await this.graphSubsModel
          .findOneAndDelete({ user, graph })
          .session(session)
          .lean()
          .exec();

        if (deletedSub) {
          // Подписка была удалена - уменьшаем счетчики
          await Promise.all([
            this.GraphModel.findByIdAndUpdate(
              graph,
              { $inc: { subsNum: -1 } },
              { session, lean: true }
            ).exec(),
            this.UserModel.findByIdAndUpdate(
              user,
              { $inc: { graphSubsNum: -1 } },
              { session, lean: true }
            ).exec()
          ]);
          
          return { subscribed: false };
        } else {
          // Подписки не было - создаем и увеличиваем счетчики
          await Promise.all([
            this.graphSubsModel.create([{ user, graph }], { session }),
            this.GraphModel.findByIdAndUpdate(
              graph,
              { $inc: { subsNum: 1 } },
              { session, lean: true }
            ).exec(),
            this.UserModel.findByIdAndUpdate(
              user,
              { $inc: { graphSubsNum: 1 } },
              { session, lean: true }
            ).exec()
          ]);
          
          return { subscribed: true };
        }
      });
    } catch (error) {
      console.error('Error in toggleSub:', error);
      throw new InternalServerErrorException('Ошибка при переключении подписки');
    } finally {
      await session.endSession();
    }
  }

  // --- Получение расписания из подписанных графов ---
  // --- Для страницы расписания - стабильное расписание и записанные мероприяти ---
  async getSubsSchedule(userId: Types.ObjectId) {
    try {
      // Быстро получаем ID подписанных графов (упрощенный aggregate)
      const subscribedGraphs = await this.graphSubsModel
        .find({ user: userId })
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
        this.eventRegsService.getEventsByUserId(userId)
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
  async getSubsEvents(userId: Types.ObjectId) {
    // Оптимизированный подход: параллельно получаем все необходимые данные
    const [subscribedGraphs, userEventRegs] = await Promise.all([
      // Получаем подписанные графы пользователя
      this.graphSubsModel.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$graph' } },
        { $project: { _id: 1 } }
      ]).exec(),
      
      // Получаем все записи пользователя на события одним запросом
      this.eventRegsModel
        .find({ userId })
        .select('eventId')
        .lean()
        .exec()
    ]);

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
          },
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

  // --- Альтернативная высокопроизводительная версия ---
  // --- Использует MongoDB bulk operations для максимальной производительности ---
  async toggleSubBulk(user: string | Types.ObjectId, graph: string | Types.ObjectId): Promise<{ subscribed: boolean }> {
    const session = await this.graphSubsModel.db.startSession();
    
    try {
      return await session.withTransaction(async () => {
        // Пытаемся удалить подписку
        const deleteResult = await this.graphSubsModel
          .deleteOne({ user, graph })
          .session(session)
          .exec();

        if (deleteResult.deletedCount > 0) {
          // Подписка была удалена - используем bulk operations для обновления счетчиков
          const bulkOps = [
            {
              updateOne: {
                filter: { _id: graph },
                update: { $inc: { subsNum: -1 } }
              }
            }
          ];

          const userBulkOps = [
            {
              updateOne: {
                filter: { _id: user },
                update: { $inc: { graphSubsNum: -1 } }
              }
            }
          ];

          await Promise.all([
            this.GraphModel.bulkWrite(bulkOps, { session }),
            this.UserModel.bulkWrite(userBulkOps, { session })
          ]);

          return { subscribed: false };
        } else {
          // Подписки не было - создаем новую и обновляем счетчики
          const bulkOps = [
            {
              updateOne: {
                filter: { _id: graph },
                update: { $inc: { subsNum: 1 } }
              }
            }
          ];

          const userBulkOps = [
            {
              updateOne: {
                filter: { _id: user },
                update: { $inc: { graphSubsNum: 1 } }
              }
            }
          ];

          await Promise.all([
            this.graphSubsModel.create([{ user, graph }], { session }),
            this.GraphModel.bulkWrite(bulkOps, { session }),
            this.UserModel.bulkWrite(userBulkOps, { session })
          ]);

          return { subscribed: true };
        }
      });
    } catch (error) {
      console.error('Error in toggleSubBulk:', error);
      throw new InternalServerErrorException('Ошибка при переключении подписки');
    } finally {
      await session.endSession();
    }
  }

}
