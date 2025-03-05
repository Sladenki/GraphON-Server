import { Injectable } from '@nestjs/common';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { GraphModel } from './graph.model';
import { CreateGraphDto } from './dto/create-graph.dto';
import { Types } from 'mongoose';
import { GraphSubsService } from 'src/graphSubs/graphSubs.service';

@Injectable()
export class GraphService {
  constructor(
    @InjectModel(GraphModel)
    private readonly GraphModel: ModelType<GraphModel>,

    private readonly graphSubsService: GraphSubsService,
  ) {}

  // --- Создание графа ---
  async createGraph(dto: CreateGraphDto, userId: Types.ObjectId) {
    const graph = await this.GraphModel.create({
      ...dto, 
      ownerUserId: userId, 
    });
  
    return graph;
  }  

  // --- Получение графа по id ---
  async getGraphById(id: Types.ObjectId) {
    return this.GraphModel.findById(id).populate('parentGraphId', 'name');
  }

  // --- Получение (главных) родительских графов ---
  async getParentGraphs(skip: any) {

    const graphs =  this.GraphModel
      // .find({ parentGraphId: { $exists: false } })
      .find()
      .skip(skip)
      .exec();

    return graphs
  }

  async getParentGraphsAuth(skip: any, userId: Types.ObjectId) {

    const graphs = await this.GraphModel
      .find()
      .skip(skip)
      .exec();

      const postsWithReactionsAndSubs = await Promise.all(
        graphs.map(async (graph) => {

          // Проверяем, подписан ли пользователь на граф
          const isSubscribed = await this.graphSubsService.isUserSubsExists(
            graph._id.toString(),
            userId.toString()
          );
  
          return {
            ...graph.toObject(),
            isSubscribed,
          };
        })
      );

    return postsWithReactionsAndSubs
  }

  async getAllChildrenGraphs(parentGraphId: Types.ObjectId) {
    return this.GraphModel.find().exec();
  }

  // --- Создание дочернего графа и обновление родительского ---
  async createChildGraph(name: string, parentGraphId: Types.ObjectId) {
    // Создаем новый дочерний граф
    const childGraph = await this.GraphModel.create({ name, parentGraphId });

    // Обновляем родительский граф, увеличивая childGraphNum на 1
    await this.GraphModel.findByIdAndUpdate(parentGraphId, {
      $inc: { childGraphNum: 1 },
    }).exec();

    // Возвращаем созданный дочерний граф
    return childGraph;
  }
}
