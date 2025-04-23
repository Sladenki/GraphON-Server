import { forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { GraphSubsModel } from './graphSubs.model';
import { Types } from 'mongoose';
import { ScheduleService } from 'src/schedule/schedule.service';
import { GraphModel } from 'src/graph/graph.model';
import { EventService } from 'src/event/event.service';

@Injectable()
export class GraphSubsService {
  constructor(
    @InjectModel(GraphSubsModel)
    private readonly graphSubsModel: ModelType<GraphSubsModel>,

    @InjectModel(GraphModel)
    private readonly GraphModel: ModelType<GraphModel>,

    private readonly scheduleService: ScheduleService,
    private readonly eventService: EventService
  ) {}

  // --- Переключение подписки на граф ---
  async toggleSub(user: string | Types.ObjectId, graph: string | Types.ObjectId) { 

    // Проверяем, существует ли уже объект 
    const isSubExists = await this.graphSubsModel.findOne({ user, graph }).exec();

    if (isSubExists) {
      // Если существует, то удаляем его и обновляем счётчики
      await Promise.all([
        this.GraphModel.findOneAndUpdate({ _id: graph }, { $inc: { subsNum: -1 } }).exec(),
        this.graphSubsModel.deleteOne({ user, graph })
      ]);
    } else {
      // Создаём новый объект, если его ещё нет, и обновляем счётчики
      await Promise.all([
        this.GraphModel.findOneAndUpdate({ _id: graph }, { $inc: { subsNum: 1 } }).exec(),
        this.graphSubsModel.create({ user, graph })
      ]);
    }
  }

  // --- Получение расписания из подписанных графов ---
  async getSubsSchedule(userId: Types.ObjectId) {
    try {
      // Получаем массив графов, на которые подписан пользователь
      const subscribedGraphs = await this.graphSubsModel
        .find({ user: userId })
        .distinct('graph')
        .exec();

      // Если пользователь не подписан ни на один граф, возвращаем пустые массивы
      if (!subscribedGraphs || subscribedGraphs.length === 0) {
        return { schedule: [], events: [] };
      }

      // Преобразуем ObjectId в строки
      const graphIds = subscribedGraphs.map(graphId => graphId.toString());

      // Выполняем два запроса параллельно
      const [schedule, events] = await Promise.all([
        this.scheduleService.getWeekdaySchedulesByGraphs(graphIds),
        this.eventService.getEventsByGraphsIds(graphIds),
      ]);

      return { 
        schedule: schedule || [], 
        events: events || [] 
      };
    } catch (error) {
      console.error('Error in getSubsSchedule:', error);
      throw new InternalServerErrorException('Ошибка при получении расписания подписок');
    }
  }
  

  // --- Проверка подписки на граф ---
  async isUserSubsExists(graph: string, userId: string): Promise<boolean> {

    const reaction = await this.graphSubsModel
      .findOne({
        graph: new Types.ObjectId(graph),
        user: new Types.ObjectId(userId),
      });


    return !!reaction; // true, если реакция найдена; иначе false
  }

}
