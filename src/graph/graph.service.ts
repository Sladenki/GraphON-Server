import { Injectable } from '@nestjs/common';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { GraphModel } from './graph.model';
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

    private readonly graphSubsService: GraphSubsService,
    private readonly s3Service: S3Service,
  ) {}

  // --- Создание графа ---
  async createGraph(dto: CreateGraphDto, userId: Types.ObjectId, image?: Express.Multer.File) {
    console.log('createGraph', dto, userId, image);

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
      graphType: "default"
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
    const pipeline: PipelineStage[] = [
      {
        $skip: Number(skip) || 0
      }
    ];

    if (userId) {
      pipeline.push(
        {
          $lookup: {
            from: 'GraphSubs',
            let: { graphId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$graph', '$$graphId'] },
                      { $eq: ['$user', userId] }
                    ]
                  }
                }
              }
            ],
            as: 'subscription'
          }
        },
        {
          $addFields: {
            isSubscribed: { $gt: [{ $size: '$subscription' }, 0] }
          }
        },
        {
          $project: {
            subscription: 0
          }
        }
      );
    }

    return this.GraphModel.aggregate(pipeline).exec();
  }

  async getAllChildrenGraphs(parentGraphId: Types.ObjectId, skip: any, userId?: Types.ObjectId) {

    console.log('getAllChildrenGraphs', parentGraphId, skip, userId);

    const pipeline: PipelineStage[] = [
      {
        $match: {
          globalGraphId: parentGraphId,
          graphType: 'default'
        }
      },
      {
        $skip: Number(skip) || 0
      }
    ];

    if (userId) {
      pipeline.push(
        {
          $lookup: {
            from: 'GraphSubs',
            let: { graphId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$graph', '$$graphId'] },
                      { $eq: ['$user', userId] }
                    ]
                  }
                }
              }
            ],
            as: 'subscription'
          }
        },
        {
          $addFields: {
            isSubscribed: { $gt: [{ $size: '$subscription' }, 0] }
          }
        },
        {
          $project: {
            subscription: 0
          }
        }
      );
    }

    return this.GraphModel.aggregate(pipeline).exec();
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
    const pipeline: PipelineStage[] = [
      {
        $match: {
          graphType: 'global'
        }
      },
      {
        $sort: {
          name: 1 // сортировка по имени по возрастанию
        }
      }
    ];

    return this.GraphModel.aggregate(pipeline).exec();
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
