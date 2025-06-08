import { forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { GraphSubsModel } from './graphSubs.model';
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
async getSubsSchedule(userId: Types.ObjectId) {
  try {
    const subscribedGraphs = await this.graphSubsModel.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$graph' } },
      { $project: { _id: 1 } }
    ]).exec();

    if (!subscribedGraphs || subscribedGraphs.length === 0) {
      return { schedule: [], events: [] };
    }

    const graphIds = subscribedGraphs.map(graph => graph._id.toString());

    const [schedule, graphEvents, userEvents] = await Promise.all([
      this.scheduleService.getWeekdaySchedulesByGraphs(graphIds),
      this.eventService.getEventsByGraphsIds(graphIds),
      this.eventRegsService.getEventsByUserId(userId)
    ]);

    const graphEventIdsSet = new Set(graphEvents.map(e => e._id.toString()));
    const allUserEventObjs = userEvents.map((reg: any) => ({
      ...reg.eventId,
      isAttended: true
    }));

    const combinedEventsMap = new Map<string, any>();

    for (const event of graphEvents) {
      combinedEventsMap.set(event._id.toString(), {
        ...event,
        isAttended: false
      });
    }

    for (const userEvent of allUserEventObjs) {
      const id = userEvent._id.toString();
      combinedEventsMap.set(id, {
        ...userEvent,
        isAttended: true // override if already present
      });
    }

    const mergedEvents = Array.from(combinedEventsMap.values());

    console.log('mergedEvents', mergedEvents);

    return {
      schedule: schedule || [],
      events: mergedEvents
    };
  } catch (error) {
    console.error('Error in getSubsSchedule:', error);
    throw new InternalServerErrorException('Ошибка при получении расписания подписок');
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
