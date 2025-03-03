import { forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { GraphSubsModel } from './graphSubs.model';
import { Types } from 'mongoose';
import { ScheduleService } from 'src/schedule/schedule.service';
import { GraphModel } from 'src/graph/graph.model';

@Injectable()
export class GraphSubsService {
  constructor(
    @InjectModel(GraphSubsModel)
    private readonly graphSubsModel: ModelType<GraphSubsModel>,

    @InjectModel(GraphModel)
    private readonly GraphModel: ModelType<GraphModel>,

    private readonly scheduleService: ScheduleService
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
  async getSubsSchedule(userId: Types.ObjectId): Promise<any[]> {
  
    // Получаем массив графов, на которые подписан пользователь
    const subscribedGraphs = await this.graphSubsModel
      .find({ user: userId }) // Фильтруем по userId
      .distinct('graph');

    // Получаем посты из полученного массива id графов 
    // @ts-expect-error ошибка массива 
    const posts = await this.scheduleService.getWeekdaySchedulesByGraphs(subscribedGraphs)

    return posts
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
