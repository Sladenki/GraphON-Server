import { Injectable } from '@nestjs/common';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { GraphModel } from './graph.model';
import { CreateGraphDto } from './dto/create-graph.dto';
import { Types } from 'mongoose';

@Injectable()
export class GraphService {
  constructor(
    @InjectModel(GraphModel)
    private readonly GraphModel: ModelType<GraphModel>,
  ) {}

  // --- Создание графа ---
  async createGraph(dto: CreateGraphDto) {
    const graph = await this.GraphModel.create(dto);

    return graph;
  }

  // --- Получение графа по id ---
  async getGraphById(id: Types.ObjectId) {
    return this.GraphModel.findById(id).populate('parentGraphId', 'name');
  }

  // --- Получение (главных) родительских графов ---
  async getParentGraphs() {
    return this.GraphModel.find({ parentGraphId: { $exists: false } }).exec();
  }

  // --- Получение всех дочерних графов по Id родительскому ---
  async getAllChildrenGraphs(parentGraphId: Types.ObjectId) {
    console.log('parentGraphId', parentGraphId);
    return this.GraphModel.find({ parentGraphId }).exec();
  }

  // --- Создание дочернего графа и обновление родительского ---
  async createChildGraph(name: string, parentGraphId: Types.ObjectId) {
    console.log('createChildGraph', name, parentGraphId)
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
