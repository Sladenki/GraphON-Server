import { Injectable } from '@nestjs/common';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { GraphSubsModel } from './graphSubs.model';
import { Types } from 'mongoose';
import { PostService } from 'src/post/post.service';
import { ScheduleService } from 'src/schedule/schedule.service';
import { GraphModel } from 'src/graph/graph.model';

@Injectable()
export class GraphSubsService {
  constructor(
    @InjectModel(GraphSubsModel)
    private readonly graphSubsModel: ModelType<GraphSubsModel>,

    @InjectModel(GraphModel)
    private readonly GraphModel: ModelType<GraphModel>,

    private readonly postService: PostService,

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


  // --- Получение постов из подписанных графов ---
  async getSubsPosts(skip: any, userId: Types.ObjectId): Promise<any[]> {
    const skipPosts = skip ? Number(skip) : 0;
  
    // Получаем массив графов, на которые подписан пользователь
    const subscribedGraphs = await this.graphSubsModel
      .find({ user: userId }) // Фильтруем по userId
      .distinct('graph');

    // Получаем посты из полученного массива id графов 
    const posts = await this.postService.getPostsFromSubscribedGraphs(skipPosts, subscribedGraphs, userId)

    return posts
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

}
