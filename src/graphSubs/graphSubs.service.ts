import { Injectable } from '@nestjs/common';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { GraphSubsModel } from './graphSubs.model';
import { Types } from 'mongoose';
import { PostService } from 'src/post/post.service';

@Injectable()
export class GraphSubsService {
  constructor(
    @InjectModel(GraphSubsModel)
    private readonly graphSubsModel: ModelType<GraphSubsModel>,

    private readonly postService: PostService
  ) {}

  // --- Переключение подписки на граф ---
  async toggleSub(user: string | Types.ObjectId, graph: string | Types.ObjectId) { 

    // Проверяем, существует ли уже объект 
    const isSubExists = await this.graphSubsModel.findOne({ user, graph }).exec();

    if (isSubExists) {
      // Если существует, то удаляем его и обновляем счётчики
      await Promise.all([
        this.graphSubsModel.deleteOne({ user, graph })
      ]);
    } else {
      // Создаём новый объект, если его ещё нет, и обновляем счётчики
      await Promise.all([
        this.graphSubsModel.create({ user, graph })
      ]);
    }
  }


  // --- Получение 
  async getSubsPosts(skip: any, userId: Types.ObjectId): Promise<any[]> {
    const skipPosts = skip ? Number(skip) : 0;
  
    // Получаем массив графов, на которые подписан пользователь
    const subscribedGraphs = await this.graphSubsModel
      .find({ user: userId }) // Фильтруем по userId
      .distinct('graph');

    const posts = await this.postService.getPostsFromSubscribedGraphs(skipPosts, subscribedGraphs)

    return posts
  }

}
