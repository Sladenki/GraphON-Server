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
    // Создаем новый граф
    const graph = await this.GraphModel.create({
      ...dto, 
      ownerUserId: userId, 
    });

    // Если это дочерний граф (есть parentGraphId), обновляем счетчик родительского графа
    if (dto.parentGraphId) {
      await this.GraphModel.findByIdAndUpdate(dto.parentGraphId, {
        $inc: { childGraphNum: 1 },
      }).exec();
    }
  
    return graph;
  }  

  // --- Получение графа по id ---
  // async getGraphById(id: Types.ObjectId) {
  //   return this.GraphModel.findById(id).populate('parentGraphId', 'name');
  // }

  // --- Получение (главных) родительских графов ---
  async getParentGraphs(skip: any, userId?: Types.ObjectId) {
    const graphs = await this.GraphModel
      .find()
      .skip(skip)
      .exec();

    if (!userId) {
      return graphs.map(graph => ({
        ...graph.toObject(),
        isSubscribed: false
      }));
    }

    const postsWithReactionsAndSubs = await Promise.all(
      graphs.map(async (graph) => {
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

    return postsWithReactionsAndSubs;
  }

  async getAllChildrenGraphs(parentGraphId: Types.ObjectId) {
    return this.GraphModel.find().exec();
  }
}
