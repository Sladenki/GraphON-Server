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
  async toggleSub(user: string | Types.ObjectId, graph: string | Types.ObjectId) {

    console.log('toggleSub', user, graph)

    try {
      // Проверяем существование подписки
      const existingSub = await this.graphSubsModel
        .findOne({ user, graph })
        .lean()
        .exec();

      if (existingSub) {
        // Если подписка существует, удаляем её и уменьшаем счетчик
        await Promise.all([
          this.GraphModel.findOneAndUpdate(
            { _id: graph },
            { $inc: { subsNum: -1 } },
            { lean: true }
          ).exec(),
          this.graphSubsModel.deleteOne({ user, graph }).exec(),
          this.UserModel.findOneAndUpdate({ _id: user }, { $inc: { graphSubsNum: -1 } }).exec()
        ]);
      } else {
        // Если подписки нет, создаем её и увеличиваем счетчик
        await Promise.all([
          this.GraphModel.findOneAndUpdate(
            { _id: graph },
            { $inc: { subsNum: 1 } },
            { lean: true }
          ).exec(),
          this.graphSubsModel.create({ user, graph }),
          this.UserModel.findOneAndUpdate({ _id: user }, { $inc: { graphSubsNum: 1 } }).exec()
        ]);
      }
    } catch (error) {
      console.error('Error in toggleSub:', error);
      throw new InternalServerErrorException('Ошибка при переключении подписки');
    }
  }

  // --- Получение расписания из подписанных графов ---
  // --- Для страницы расписания - стабильное расписание и записанные мероприяти ---
  async getSubsSchedule(userId: Types.ObjectId) {
    try {
      const subscribedGraphs = await this.graphSubsModel.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$graph' } },
        { $project: { _id: 1 } }
      ]).exec();

      const graphIds = subscribedGraphs?.length > 0 
      ? subscribedGraphs.map(graph => graph._id.toString()) 
      : [];

      const [schedule, userEvents] = await Promise.all([
        graphIds.length > 0 
          ? this.scheduleService.getWeekdaySchedulesByGraphs(graphIds)
          : Promise.resolve([]),
        this.eventRegsService.getEventsByUserId(userId)
      ]);

      const mergedEvents = userEvents.map((reg: any) => ({
        ...reg.eventId,
        isAttended: true
      }));


      return {
        schedule: schedule || [],
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

}
