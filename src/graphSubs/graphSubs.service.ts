import { Injectable } from '@nestjs/common';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { GraphSubsModel } from './graphSubs.model';
import { Types } from 'mongoose';

@Injectable()
export class GraphSubsService {
  constructor(
    @InjectModel(GraphSubsModel)
    private readonly graphSubsModel: ModelType<GraphSubsModel>,
  ) {}

  async toggleSub(userId: string | Types.ObjectId, graphId: string | Types.ObjectId) { 

    // Проверяем, существует ли уже объект 
    const isSubExists = await this.graphSubsModel.findOne({ userId, graphId }).exec();

    if (isSubExists) {
      // Если существует, то удаляем его и обновляем счётчики
      await Promise.all([
        this.graphSubsModel.deleteOne({ user: userId, graphId })
      ]);
    } else {
      // Создаём новый объект, если его ещё нет, и обновляем счётчики
      await Promise.all([
        this.graphSubsModel.create({ user: userId, graphId })
      ]);
    }
  }


}
