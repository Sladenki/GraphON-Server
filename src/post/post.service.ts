import { BadRequestException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { PostModel } from './post.model';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { CreatePostDto } from './dto/create-post.dto';
import { UserModel } from 'src/user/user.model';
import { Types } from 'mongoose';
// import { CACHE_MANAGER } from '@nestjs/cache-manager';
// import { Cache } from 'cache-manager';

import { DEFAULTLIMIT_POSTS } from 'src/constants/posts';
import { GraphService } from 'src/graph/graph.service';
import { S3Service } from 'src/s3/s3.service';
import { PostReactionService } from 'src/postReaction/postReaction.service';
import { UserPostReactionService } from 'src/userPostReaction/userPostReaction.service';
import { Emoji } from 'src/postReaction/postReaction.model';
import { GraphSubsService } from 'src/graphSubs/graphSubs.service';
import { UserPostReactionModel } from 'src/userPostReaction/userPostReaction.model';
import { GraphSubsModel } from 'src/graphSubs/graphSubs.model';


@Injectable()
export class PostService {
  constructor(
    @InjectModel(PostModel)
    private readonly PostModel: ModelType<PostModel>,

    @InjectModel(UserModel)
    private readonly UserModel: ModelType<UserModel>,

    @InjectModel(UserPostReactionModel)
    private readonly userPostReactionModel: ModelType<UserPostReactionModel>,

    @InjectModel(GraphSubsModel)
    private readonly graphSubsModel: ModelType<GraphSubsModel>,

    // Redis
    // @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,

    // Выделения ключевых слов

    private readonly graphService: GraphService,

    private readonly s3Service: S3Service,

    private readonly postReactionService: PostReactionService,

    private readonly userPostReactionService: UserPostReactionService,

    private readonly graphSubsService: GraphSubsService,

  ) {}

  // --- Создание поста ---
  async createPost(dto: CreatePostDto, creatorId: Types.ObjectId) {
    console.log('createPost', dto);

    const childrenTopic = dto.childrenTopic;
    console.log('childrenTopic', childrenTopic);

    const selectedTopicId = dto.selectedTopic;
    console.log('selectedTopicId', selectedTopicId);

    // Проверяем, есть ли указанный дочерний граф и родительский ID
    let childGraphId;
    if (childrenTopic && selectedTopicId) {
      // @ts-ignore
      const childGraph = await this.graphService.createChildGraph(
        childrenTopic,
        // @ts-ignore
        selectedTopicId,
      );
      childGraphId = childGraph._id; // Получаем ID созданного дочернего графа
    }

    // @ts-ignore
    const reactionObject = JSON.parse(dto.reaction);

    this.UserModel.findByIdAndUpdate(
      creatorId,
      { $inc: { postsNum: 1 } },
      { new: true }, // Возвращает обновленный документ
    )
    .exec()


    // Проверяем, есть ли imgPath, и загружаем файл на S3
    let imgPathUrl: string | undefined = undefined;
    if (dto.imgPath) {
      imgPathUrl = await this.s3Service.uploadFile(dto.imgPath);
    }


    // Создаем пост
    const newPost = await this.PostModel.create({
      content: dto.content,
      user: creatorId,
      // @ts-ignore
      graphId: new Types.ObjectId(selectedTopicId),
      // @ts-ignore
      ...(imgPathUrl && { imgPath: imgPathUrl.key }),
    });



    // Если `reactionObject` присутствует, отправляем его в postReactionService
    let reactionId: Types.ObjectId | undefined = undefined;
    if (reactionObject) {
      // Если emoji пустое, установим значение по умолчанию
      const emoji = reactionObject.emoji || Emoji.LOVE;

      const reactionDto: any = {
        ...reactionObject,
        emoji,
        post: newPost._id.toString(), // Передаем ID созданного поста
      };

      try {
        const reaction = await this.postReactionService.createPostReaction(reactionDto);

        reactionId = reaction._id;
        console.log('Reaction created successfully');
      } catch (error) {
        console.error('Error creating reaction:', error);
      }
    }

    if (reactionId) {
      await this.PostModel.findByIdAndUpdate(
        newPost._id,
        { $push: { reactions: reactionId } }, // Добавляем ID реакции в массив reactions
        { new: true },
      );
    }


    return newPost;
  }


  // --- Получение всех постов для главной без авторизации ---
  async getPostsNoAuth(skip: any): Promise<any[]> {
    const skipPosts = skip ? Number(skip) : 0;
    
    try {

      // Агрегация для минимизации запросов и объединения данных
      const posts = await this.PostModel.aggregate([
        // Сортируем по дате создания
        { $sort: { createdAt: -1 } },
        
        // Пропускаем нужное количество записей
        { $skip: skipPosts },

        // // Ограничиваем количество возвращаемых записей
        { $limit: DEFAULTLIMIT_POSTS },

        // Заполняем поле user, включая только name и avaPath
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { 'user.password': 0 } }, // Защита данных пользователя

        // Заполняем поле reactions
        {
          $lookup: {
            from: 'PostReaction',
            localField: 'reactions',
            foreignField: '_id',
            as: 'reactions',
          },
        },

        // Заполняем поле graphId
        {
          $lookup: {
            from: 'graphs',
            localField: 'graphId',
            foreignField: '_id',
            as: 'graphId',
          },
        },
        { $unwind: { path: '$graphId', preserveNullAndEmptyArrays: true } },

        // Убираем MongoDB-метаданные
        { $project: { __v: 0 } },
      ]);

      return posts;
    } catch (error) {
   
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not fetch posts');
    }
  }


  // --- Получение всех постов для главной для авторизованного пользователя ---
  async getPostsAuth(skip: any, userId: Types.ObjectId): Promise<any[]> {
    const skipPosts = skip ? Number(skip) : 0;

    const posts = await this.PostModel
      .find()
      .populate('user', 'name avaPath')
      .populate('reactions', '_id text emoji clickNum')
      .populate('graphId', 'name')
      .skip(skipPosts)
      .limit(DEFAULTLIMIT_POSTS)
      .sort({ createdAt: -1 })
      .lean(); // Преобразуем посты в обычные объекты

    // Проверка на реакцию
    const postsWithReactions = await Promise.all(
      posts.map(async (post) => {
        const reactionsWithStatus = await Promise.all(
          post.reactions.map(async (reaction) => {
            const isReacted = userId
              ? await this.userPostReactionService.isUserReactionExists(
                  reaction._id.toString(), // ID реакции
                  userId.toString() // ID пользователя
                )
              : false;
  
            return {
              ...reaction, // Оставляем все остальные данные реакции
              isReacted, // Добавляем поле isReacted
            };
          })
        );

        // Проверка на подписку
        const isSubscribed = userId
        ? await this.graphSubsService.isUserSubsExists(
            post.graphId._id.toString(), // ID графа
            userId.toString() // ID пользователя
          )
        : false;

  
        return {
          ...post,
          reactions: reactionsWithStatus, // Заменяем реакции на обновленные с isReacted
          isSubscribed
        };
      })
    );
  
    return postsWithReactions;
  
  }

  //  ---------------------

  // async getPostsAuth(skip: number, userId: Types.ObjectId): Promise<any[]> {
  //   console.log('userId', userId)

  //   try {
  //     const posts = await this.PostModel.aggregate([
  //       { $sort: { createdAt: -1 } }, // Сортировка по дате создания
  //       // { $skip: skip }, // Пропускаем указанные записи
  //       { $limit: DEFAULTLIMIT_POSTS }, // Ограничиваем количество записей
  //       // Подключаем данные пользователя
  //       {
  //         $lookup: {
  //           from: 'users',
  //           localField: 'user',
  //           foreignField: '_id',
  //           as: 'userDetails',
  //         },
  //       },
  //       // Подключаем данные графа
  //       {
  //         $lookup: {
  //           from: 'graphs',
  //           localField: 'graphId',
  //           foreignField: '_id',
  //           as: 'graphDetails',
  //         },
  //       },
  //       // Подключаем данные о реакциях
  //       {
  //         $lookup: {
  //           from: 'PostReaction',
  //           localField: 'reactions',
  //           foreignField: '_id',
  //           as: 'reactionDetails',
  //         },
  //       },
  //       // Подключаем реакции пользователя
  //       {
  //         $lookup: {
  //           from: 'userpostreactions',
  //           let: { reactionIds: '$reactions', userId }, // Передаём массив реакций и ID пользователя
  //           pipeline: [
  //             {
  //               $match: {
  //                 $expr: {
  //                   $and: [
  //                     { $in: ['$postReaction', '$$reactionIds'] }, // ID реакции в массиве
  //                     { $eq: ['$user', '$$userId'] }, // Реакция от пользователя
  //                   ],
  //                 },
  //               },
  //             },
  //           ],
  //           as: 'userReactions',
  //         },
  //       },
  //       // Добавляем поле isReacted для каждой реакции
  //       {
  //         $addFields: {
  //           reactions: {
  //             $map: {
  //               input: '$reactionDetails', // Для каждой детали реакции
  //               as: 'reaction',
  //               in: {
  //                 _id: '$$reaction._id',
  //                 text: '$$reaction.text',
  //                 emoji: '$$reaction.emoji',
  //                 clickNum: '$$reaction.clickNum',
  //                 isReacted: {
  //                   $in: ['$$reaction._id', { $map: { input: '$userReactions', as: 'userReaction', in: '$$userReaction.postReaction' } }],
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       },
  //       // Формируем результат
  //       {
  //         $project: {
  //           _id: 1,
  //           user: {
  //             _id: { $arrayElemAt: ['$userDetails._id', 0] },
  //             avaPath: { $arrayElemAt: ['$userDetails.avaPath', 0] },
  //             name: { $arrayElemAt: ['$userDetails.name', 0] },
  //           },
  //           graphId: {
  //             _id: { $arrayElemAt: ['$graphDetails._id', 0] },
  //             name: { $arrayElemAt: ['$graphDetails.name', 0] },
  //           },
  //           content: 1,
  //           imgPath: 1,
  //           createdAt: 1,
  //           updatedAt: 1,
  //           reactions: 1,
  //           isSubscribed: {
  //             $in: [{ $arrayElemAt: ['$graphDetails._id', 0] }, { $map: { input: '$userReactions', as: 'reaction', in: '$$reaction.graph' } }],
  //           },
  //         },
  //       },
  //     ]);
  
  //     return posts;
  //   } catch (error) {
  //     console.error('Error in getPostsAuth:', error);
  //     throw new InternalServerErrorException('Ошибка получения постов с реакциями.');
  //   }
  // }
  

  // --- Получение постов из подписанных графов ---
  async getPostsFromSubscribedGraphs(skip: any, subscribedGraphs: any[], userId: Types.ObjectId): Promise<any[]> {

    const posts = await this.PostModel
      .find({ graphId: { $in: subscribedGraphs } }) // Фильтр по graph
      .populate('user', 'name avaPath')
      .populate('reactions', '_id text emoji clickNum')
      .populate('graphId', 'name')
      .skip(skip)
      .limit(DEFAULTLIMIT_POSTS)
      .sort({ createdAt: -1 })
      .lean(); 

    // Проверка на реакцию
    const postsWithReactions = await Promise.all(
      posts.map(async (post) => {
        const reactionsWithStatus = await Promise.all(
          post.reactions.map(async (reaction) => {
            const isReacted = userId
              ? await this.userPostReactionService.isUserReactionExists(
                  reaction._id.toString(), // ID реакции
                  userId.toString() // ID пользователя
                )
              : false;
  
            return {
              ...reaction, // Оставляем все остальные данные реакции
              isReacted, // Добавляем поле isReacted
            };
          })
        );
  
        return {
          ...post,
          reactions: reactionsWithStatus, // Заменяем реакции на обновленные с isReacted
        };
      })
    );
  
    return postsWithReactions;

  }



  


}
