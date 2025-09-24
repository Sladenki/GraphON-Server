import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
import { RedisService } from 'src/redis/redis.service';
import type { Express } from 'express';
import { PipelineStage } from 'mongoose';
import { UserModel } from 'src/user/user.model';

@Injectable()
export class GraphService {
  // Константы для TTL кэша
  private readonly GRAPH_CACHE_TTL = 7 * 24 * 60 * 60; // 1 неделя в секундах
  private readonly USER_SUBS_CACHE_TTL = 5 * 60; // 5 минут в секундах

  constructor(
    @InjectModel(GraphModel)
    private readonly GraphModel: ModelType<GraphModel>,

    @InjectModel(GraphSubsModel)
    private readonly graphSubsModel: ModelType<GraphSubsModel>,

    private readonly graphSubsService: GraphSubsService,
    private readonly s3Service: S3Service,
    private readonly redisService: RedisService,
    @InjectModel(UserModel)
    private readonly UserModel: ModelType<UserModel>,
  ) {}

  // --- Вспомогательные методы для кэша ---
  private generateCacheKey(method: string, params: any): string {
    const paramsString = JSON.stringify(params);
    return `graph:${method}:${paramsString}`;
  }

  private async invalidateGraphCache(): Promise<void> {
    // Инвалидируем все кэши, связанные с графами
    await this.redisService.delPattern('graph:*');
  }

  // --- Получение подписок пользователя с кэшированием ---
  private async getUserSubscriptions(userId: Types.ObjectId): Promise<Set<string>> {
    const cacheKey = `userSubs:${userId.toString()}`;
    
    // Пытаемся получить из кэша
    const cachedSubs = await this.redisService.get(cacheKey);
    if (cachedSubs && Array.isArray(cachedSubs)) {
      console.log(`📖 Redis CACHE HIT: ${cacheKey} (${cachedSubs.length} подписок)`);
      return new Set(cachedSubs as string[]);
    }

    // Если нет в кэше, получаем из БД
    const userSubscriptions = await this.graphSubsModel
      .find({ user: userId })
      .select('graph')
      .lean()
      .exec();

    const subscribedGraphIds = userSubscriptions.map(sub => sub.graph.toString());
    
    // Сохраняем в кэш на 5 минут (короткий TTL для подписок)
    await this.redisService.set(cacheKey, subscribedGraphIds, this.USER_SUBS_CACHE_TTL);
    console.log(`📝 Redis CACHE MISS: ${cacheKey} (${subscribedGraphIds.length} подписок сохранено в кэш)`);
    
    return new Set(subscribedGraphIds);
  }

  // --- Инвалидация кэша подписок пользователя ---
  private async invalidateUserSubscriptionsCache(userId: Types.ObjectId): Promise<void> {
    const cacheKey = `userSubs:${userId.toString()}`;
    await this.redisService.del(cacheKey);
  }

  // --- Добавление информации о подписках к графам ---
  private addSubscriptionInfo(graphs: any[], subscribedGraphIds: Set<string>): any[] {
    return graphs.map(graph => ({
      ...graph,
      isSubscribed: subscribedGraphIds.has(graph._id.toString())
    }));
  }

  // --- Создание графа ---
  async createGraph(dto: CreateGraphDto, userId: Types.ObjectId, image?: Express.Multer.File) {
    let imgPath: string | undefined;

    if (image) {
      // Получаем название глобального графа
      const globalGraph = await this.GraphModel.findById(dto.globalGraphId).select('name').lean();
      const globalGraphName = globalGraph?.name || 'unknown';
      
      // Get file extension from original filename
      const fileExtension = image.originalname.split('.').pop();
      // Create filename using graph name and original file extension
      const fileName = `${dto.name}.${fileExtension}`;
      // Create the desired path format for S3 with global graph name
      const s3Path = `graphAva/${globalGraphName}/${fileName}`;
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

    // Добавляем граф в managedGraphIds пользователя
    await this.UserModel.findByIdAndUpdate(
      userId,
      { $addToSet: { managedGraphIds: graph._id } },
      { new: false }
    ).exec();

    // Если это дочерний граф (есть parentGraphId), обновляем счетчик родительского графа
    if (dto.parentGraphId) {
      await this.GraphModel.findByIdAndUpdate(dto.parentGraphId, {
        $inc: { childGraphNum: 1 },
      }).exec();
    }

    // Инвалидируем кэш после создания нового графа
    await this.invalidateGraphCache();
  
    return graph;
  }  

  // --- Получение графа по id ---
  async getGraphById(id: Types.ObjectId) {
    const cacheKey = this.generateCacheKey('getGraphById', { id: id.toString() });
    
    // Пытаемся получить из кэша
    const cachedGraph = await this.redisService.get(cacheKey);
    if (cachedGraph) {
      return cachedGraph;
    }

    // Если нет в кэше, получаем из БД
    const graph = await this.GraphModel.findById(id).populate('parentGraphId', 'name');
    
    // Сохраняем в кэш на 1 неделю
    if (graph) {
      await this.redisService.set(cacheKey, graph, this.GRAPH_CACHE_TTL);
    }
    
    return graph;
  }

  // --- Получение (главных) родительских графов ---
  async getParentGraphs(skip: any, userId?: Types.ObjectId) {
    const cacheKey = this.generateCacheKey('getParentGraphs', { 
      skip: Number(skip) || 0
    });
    
    // Пытаемся получить базовые данные графов из кэша
    let graphs = await this.redisService.get(cacheKey);
    
    if (!graphs || !Array.isArray(graphs)) {
      // Если нет в кэше, получаем из БД
      graphs = await this.GraphModel
        .find()
        .skip(Number(skip) || 0)
        .lean()
        .exec();
      
      // Сохраняем базовые данные в кэш на 1 день
      await this.redisService.set(cacheKey, graphs, 86400);
    }

    if (!userId) {
      // Если пользователь не авторизован, возвращаем графы без информации о подписках
      return graphs as any[];
    }

    // Получаем подписки пользователя (с отдельным кэшированием)
    const subscribedGraphIds = await this.getUserSubscriptions(userId);
    
    // Добавляем информацию о подписках к графам
    return this.addSubscriptionInfo(graphs as any[], subscribedGraphIds);
  }

  async getAllChildrenGraphs(parentGraphId: Types.ObjectId, skip: any, userId?: Types.ObjectId) {
    const cacheKey = this.generateCacheKey('getAllChildrenGraphs', { 
      parentGraphId: parentGraphId.toString(),
      skip: Number(skip) || 0
    });
    
    // Пытаемся получить базовые данные графов из кэша
    let graphs = await this.redisService.get(cacheKey);
    
    if (!graphs || !Array.isArray(graphs)) {
      // Если нет в кэше, получаем из БД
      graphs = await this.GraphModel
        .find({
          globalGraphId: parentGraphId,
          graphType: 'default'
        })
        .populate('ownerUserId', 'firstName lastName username avaPath')
        .skip(Number(skip) || 0)
        .lean()
        .exec();
      
      // Сохраняем базовые данные в кэш на 1 день
      await this.redisService.set(cacheKey, graphs, 86400);
    }

    if (!userId) {
      // Если пользователь не авторизован, возвращаем графы без информации о подписках
      return graphs as any[];
    }

    // Получаем подписки пользователя (с отдельным кэшированием)
    const subscribedGraphIds = await this.getUserSubscriptions(userId);
    
    // Добавляем информацию о подписках к графам
    return this.addSubscriptionInfo(graphs as any[], subscribedGraphIds);
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
      // Для глобальных графов используем их собственное название
      const s3Path = `graphAva/${dto.name}/${fileName}`;
      const uploadResult = await this.s3Service.uploadFile(image, s3Path);
      imgPath = `images/${s3Path}`;
    }

    const graph = await this.GraphModel.create({
      ...dto,
      ownerUserId: userId,
      imgPath,
      graphType: "global"
    });

    // Добавляем граф в managedGraphIds пользователя
    await this.UserModel.findByIdAndUpdate(
      userId,
      { $addToSet: { managedGraphIds: graph._id } },
      { new: false }
    ).exec();

    // Инвалидируем кэш после создания нового глобального графа
    await this.invalidateGraphCache();

    return graph;
  }

  // --- Создание графа-тематики ---
  async createTopicGraph(dto: CreateTopicGraphDto, userId: Types.ObjectId, image?: Express.Multer.File) {
    let imgPath: string | undefined;

    if (image) {
      // Получаем название глобального графа (родительского для тематики)
      const globalGraph = await this.GraphModel.findById(dto.parentGraphId).select('name').lean();
      const globalGraphName = globalGraph?.name || 'unknown';
      
      const fileExtension = image.originalname.split('.').pop();
      const fileName = `${dto.name}.${fileExtension}`;
      // Для тематических графов используем название глобального графа
      const s3Path = `graphAva/${globalGraphName}/${fileName}`;
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

    // Добавляем граф в managedGraphIds пользователя
    await this.UserModel.findByIdAndUpdate(
      userId,
      { $addToSet: { managedGraphIds: graph._id } },
      { new: false }
    ).exec();

    // Обновляем счетчик родительского графа
    await this.GraphModel.findByIdAndUpdate(dto.parentGraphId, {
      $inc: { childGraphNum: 1 },
    }).exec();

    // Инвалидируем кэш после создания нового графа-тематики
    await this.invalidateGraphCache();

    return graph;
  }

  // --- Получение глобальных графов ---
  async getGlobalGraphs() {
    const cacheKey = this.generateCacheKey('getGlobalGraphs', {});
    
    // Пытаемся получить из кэша
    const cachedGraphs = await this.redisService.get(cacheKey);
    if (cachedGraphs) {
      return cachedGraphs;
    }

    // Если нет в кэше, получаем из БД
    const graphs = await this.GraphModel.find({ graphType: 'global' })
      .sort({ name: 1 })
      .lean()
      .exec();
    
    // Сохраняем в кэш на 1 день
    await this.redisService.set(cacheKey, graphs, 86400);
    
    return graphs;
  }

  // --- Получение глобального графа с его графами-тематиками ---
  async getTopicGraphsWithMain(globalGraphId: Types.ObjectId) {
    const cacheKey = this.generateCacheKey('getTopicGraphsWithMain', { 
      globalGraphId: globalGraphId.toString() 
    });
    
    // Пытаемся получить из кэша
    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

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

    const result = {
      globalGraph,
      topicGraphs
    };

    // Сохраняем в кэш на 1 день
    await this.redisService.set(cacheKey, result, 86400);
    
    return result;
  }

  // --- Удаление графа с каскадным удалением подписок и обновлением счетчиков пользователей ---
  async deleteGraph(graphId: Types.ObjectId, requesterId: Types.ObjectId): Promise<{ deleted: boolean }>{
    const session = await this.GraphModel.db.startSession();

    // Пользователи, кэш которых нужно инвалидировать после транзакции
    let affectedUserIds: string[] = [];

    try {
      await session.withTransaction(async () => {
        // Проверяем существование графа и право на удаление
        const graph = await this.GraphModel.findById(graphId)
          .session(session)
          .lean()
          .exec();

        if (!graph) {
          throw new NotFoundException('Граф не найден');
        }

        // Проверяем роль пользователя: если role === 'create', разрешаем удаление независимо от владения
        const requester = await this.UserModel.findById(requesterId)
          .select('role')
          .session(session)
          .lean()
          .exec();
        const isCreateRole = requester?.role === 'create';

        if (!isCreateRole && graph.ownerUserId?.toString() !== requesterId.toString()) {
          throw new ForbiddenException('Нет прав на удаление графа');
        }

        // Находим все подписки на этот граф и готовим декременты по пользователям
        const subs = await this.graphSubsModel
          .find({ graph: graphId })
          .select('user')
          .session(session)
          .lean()
          .exec();

        const userIdToCount = new Map<string, number>();
        for (const sub of subs) {
          const userId = (sub.user as any).toString();
          userIdToCount.set(userId, (userIdToCount.get(userId) || 0) + 1);
        }

        // Удаляем подписки на граф
        await this.graphSubsModel
          .deleteMany({ graph: graphId })
          .session(session)
          .exec();

        // Декрементируем счётчики подписок пользователей, если есть затронутые
        if (userIdToCount.size > 0) {
          const userBulk = Array.from(userIdToCount.entries()).map(([userId, dec]) => ({
            updateOne: {
              filter: { _id: new Types.ObjectId(userId) },
              update: { $inc: { graphSubsNum: -dec } }
            }
          }));
          await this.UserModel.bulkWrite(userBulk, { session });
          affectedUserIds = Array.from(userIdToCount.keys());
        }

        // Если был родительский граф, уменьшаем его childGraphNum
        if (graph.parentGraphId) {
          await this.GraphModel.updateOne(
            { _id: graph.parentGraphId },
            { $inc: { childGraphNum: -1 } }
          ).session(session).exec();
        }

        // Удаляем граф из managedGraphIds владельца
        if (graph.ownerUserId) {
          await this.UserModel.updateOne(
            { _id: graph.ownerUserId },
            { $pull: { managedGraphIds: graphId } }
          ).session(session).exec();
        }

        // Удаляем сам граф
        await this.GraphModel.deleteOne({ _id: graphId })
          .session(session)
          .exec();
      });

      // Инвалидация кэшей вне транзакции
      await Promise.all([
        this.invalidateGraphCache(),
        ...affectedUserIds.map(userId => this.redisService.del(`userSubs:${userId}`))
      ]);

      return { deleted: true };
    } finally {
      await session.endSession();
    }
  }

}
