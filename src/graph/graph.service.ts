import { Injectable } from '@nestjs/common';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { GraphModel } from './graph.model';
import { GraphSubsModel } from 'src/graphSubs/graphSubs.model';
import { CreateGraphDto } from './dto/create-graph.dto';
import { CreateGlobalGraphDto } from './dto/create-global-graph.dto';
import { CreateTopicGraphDto } from './dto/create-topic-graph.dto';
import { Types } from 'mongoose';
import { GraphSubsService } from 'src/graphSubs/graphSubs.service';
import { S3Service } from 'src/s3/s3.service';
import type { Express } from 'express';
import { PipelineStage } from 'mongoose';

@Injectable()
export class GraphService {
  constructor(
    @InjectModel(GraphModel)
    private readonly GraphModel: ModelType<GraphModel>,

    @InjectModel(GraphSubsModel)
    private readonly graphSubsModel: ModelType<GraphSubsModel>,

    private readonly graphSubsService: GraphSubsService,
    private readonly s3Service: S3Service,
  ) {}

  // --- Создание графа ---
  async createGraph(dto: CreateGraphDto, userId: Types.ObjectId, image?: Express.Multer.File) {
    let imgPath: string | undefined;

    if (image) {
      // Get file extension from original filename
      const fileExtension = image.originalname.split('.').pop();
      // Create filename using graph name and original file extension
      const fileName = `${dto.name}.${fileExtension}`;
      // Create the desired path format for S3
      const s3Path = `graphAva/${fileName}`;
      const uploadResult = await this.s3Service.uploadFile(image, s3Path);
      imgPath = `images/${s3Path}`;
    }

    // Создаем новый граф
    const graph = await this.GraphModel.create({
      ...dto, 
      ownerUserId: userId, 
      imgPath,
      graphType: "default",
      globalGraphId: dto.globalGraphId
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
  async getGraphById(id: Types.ObjectId) {
    return this.GraphModel.findById(id).populate('parentGraphId', 'name');
  }

  // --- Получение (главных) родительских графов ---
  async getParentGraphs(skip: any, userId?: Types.ObjectId) {
    if (!userId) {
      // Если пользователь не авторизован, просто возвращаем графы без проверки подписки
      return this.GraphModel
        .find()
        .skip(Number(skip) || 0)
        .lean()
        .exec();
    }

    // Оптимизированный подход: сначала получаем все подписки пользователя
    const [graphs, userSubscriptions] = await Promise.all([
      // Получаем все родительские графы
      this.GraphModel
        .find()
        .skip(Number(skip) || 0)
        .lean()
        .exec(),
      
      // Получаем все подписки пользователя одним запросом
      this.graphSubsModel
        .find({ user: userId })
        .select('graph')
        .lean()
        .exec()
    ]);

    // Создаем Set для быстрого поиска подписок
    const subscribedGraphIds = new Set(
      userSubscriptions.map(sub => sub.graph.toString())
    );

    // Добавляем поле isSubscribed к каждому графу
    const graphsWithSubscription = graphs.map(graph => ({
      ...graph,
      isSubscribed: subscribedGraphIds.has(graph._id.toString())
    }));

    return graphsWithSubscription;
  }

  async getAllChildrenGraphs(parentGraphId: Types.ObjectId, skip: any, userId?: Types.ObjectId) {
    if (!userId) {
      // Если пользователь не авторизован, просто возвращаем графы без проверки подписки
      return this.GraphModel
        .find({
          globalGraphId: parentGraphId,
          graphType: 'default'
        })
        .skip(Number(skip) || 0)
        .lean()
        .exec();
    }

    // Оптимизированный подход: сначала получаем все подписки пользователя
    const [graphs, userSubscriptions] = await Promise.all([
      // Получаем все дочерние графы
      this.GraphModel
        .find({
          globalGraphId: parentGraphId,
          graphType: 'default'
        })
        .skip(Number(skip) || 0)
        .lean()
        .exec(),
      
      // Получаем все подписки пользователя одним запросом
      this.graphSubsModel
        .find({ user: userId })
        .select('graph')
        .lean()
        .exec()
    ]);

    // Создаем Set для быстрого поиска подписок
    const subscribedGraphIds = new Set(
      userSubscriptions.map(sub => sub.graph.toString())
    );

    // Добавляем поле isSubscribed к каждому графу
    const graphsWithSubscription = graphs.map(graph => ({
      ...graph,
      isSubscribed: subscribedGraphIds.has(graph._id.toString())
    }));

    return graphsWithSubscription;
  }

  // --- Получение всех дочерних графов по Id родительского графа-тематики - Для системы графов --- 
  async getAllChildrenByTopic(parentGraphId: Types.ObjectId) {

    const childrenGraphs = this.GraphModel.find({
      parentGraphId: parentGraphId,
      graphType: 'default'
    }).lean()
  
    return childrenGraphs
  }

  // --- Получение всех дочерних графов по Id глобального графа --- 
  async getAllChildrenByGlobal(globalGraphId: Types.ObjectId) {

    const [globalGraph, childrenGraphs] = await Promise.all([
      // Получаем сам глобальный граф
      this.GraphModel.findOne({
        _id: globalGraphId,
        graphType: 'global'
      }).lean(),

      // Получаем все дочерние графы
      this.GraphModel.find({
        globalGraphId: globalGraphId,
        graphType: 'default'
      }).lean()
    ]);
  
    // Возвращаем массив, где первый элемент - глобальный граф, остальные - дочерние
    return globalGraph ? [globalGraph, ...childrenGraphs] : childrenGraphs;
  }

  // --- Получение графов-тематик ---
  async getTopicGraphs(parentGraphId: Types.ObjectId) {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          graphType: 'topic',
          parentGraphId: parentGraphId
        }
      },
    ];

    return this.GraphModel.aggregate(pipeline).exec();
  }

  // --- Создание глобального графа ---
  async createGlobalGraph(dto: CreateGlobalGraphDto, userId: Types.ObjectId, image?: Express.Multer.File) {
    let imgPath: string | undefined;

    if (image) {
      const fileExtension = image.originalname.split('.').pop();
      const fileName = `${dto.name}.${fileExtension}`;
      const s3Path = `graphAva/${fileName}`;
      const uploadResult = await this.s3Service.uploadFile(image, s3Path);
      imgPath = `images/${s3Path}`;
    }

    const graph = await this.GraphModel.create({
      name: dto.name,
      city: dto.city,
      ownerUserId: userId,
      imgPath,
      graphType: "global"
    });

    return graph;
  }

  // --- Создание графа-тематики ---
  async createTopicGraph(dto: CreateTopicGraphDto, userId: Types.ObjectId, image?: Express.Multer.File) {
    let imgPath: string | undefined;

    if (image) {
      const fileExtension = image.originalname.split('.').pop();
      const fileName = `${dto.name}.${fileExtension}`;
      const s3Path = `graphAva/${fileName}`;
      const uploadResult = await this.s3Service.uploadFile(image, s3Path);
      imgPath = `images/${s3Path}`;
    }

    // Создаем новый граф-тематику
    const graph = await this.GraphModel.create({
      ...dto,
      ownerUserId: userId,
      imgPath,
      globalGraphId: dto.parentGraphId,
      graphType: "topic"
    });

    // Обновляем счетчик родительского графа
    await this.GraphModel.findByIdAndUpdate(dto.parentGraphId, {
      $inc: { childGraphNum: 1 },
    }).exec();

    return graph;
  }

  // --- Получение глобальных графов ---
  async getGlobalGraphs() {
    return this.GraphModel.find({ graphType: 'global' })
      .sort({ name: 1 })
      .lean()
      .exec();
  }

  // --- Получение глобального графа с его графами-тематиками ---
  async getTopicGraphsWithMain(globalGraphId: Types.ObjectId) {
    const [globalGraph, topicGraphs] = await Promise.all([
      // Получаем информацию о глобальном графе
      this.GraphModel.findOne({
        _id: globalGraphId,
        graphType: 'global'
      }).lean(),

      // Получаем все графы-тематики для этого глобального графа
      this.GraphModel.find({
        parentGraphId: globalGraphId,
        graphType: 'topic'
      }).sort({ name: 1 }).lean()
    ]);

    return {
      globalGraph,
      topicGraphs
    };
  }

}
