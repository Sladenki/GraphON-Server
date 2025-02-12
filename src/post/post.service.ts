import { BadRequestException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { PostModel } from './post.model';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { CreatePostDto } from './dto/create-post.dto';
import { UserModel } from 'src/user/user.model';
import { Types } from 'mongoose';
import { DEFAULTLIMIT_POSTS } from 'src/constants/posts';
import { GraphService } from 'src/graph/graph.service';
import { S3Service } from 'src/s3/s3.service';
import { PostReactionService } from 'src/postReaction/postReaction.service';
import { UserPostReactionService } from 'src/userPostReaction/userPostReaction.service';
import { Emoji } from 'src/postReaction/postReaction.model';
import { GraphSubsService } from 'src/graphSubs/graphSubs.service';


@Injectable()
export class PostService {
  constructor(
    @InjectModel(PostModel)
    private readonly PostModel: ModelType<PostModel>,

    @InjectModel(UserModel)
    private readonly UserModel: ModelType<UserModel>,

    private readonly graphService: GraphService,

    private readonly s3Service: S3Service,

    private readonly postReactionService: PostReactionService,

    private readonly userPostReactionService: UserPostReactionService,

    private readonly graphSubsService: GraphSubsService,

  ) {}

  // --- Создание поста ---
  async createPost(dto: CreatePostDto, creatorId: Types.ObjectId) {
    console.log('createPost', dto);
    
    const selectedTopicId = dto.selectedTopic;

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
        // Сортируем по дате создания (сначала самые новые записи)
        { $sort: { createdAt: -1 } },
        
        // Пропускаем нужное количество записей
        { $skip: skipPosts },

        // Ограничиваем количество возвращаемых записей
        { $limit: DEFAULTLIMIT_POSTS },

        // Заполняем поле user, включая только name и avaPath
        {
          $lookup: {
            from: 'User', // Коллекция User
            localField: 'user', // Поле в моделе Post
            foreignField: '_id', // Поле в моделе User
            as: 'user', // Имя результирующего поля
          },
        },
        // Если поле user содержит массив, он разворачивается в объект. 
        // Если массив пустой, используется preserveNullAndEmptyArrays: true, чтобы поле оставалось пустым вместо удаления записи.
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

        {
          $project: {
              _id: 1,
              user: {
                  _id: 1,
                  email: 1,
                  avaPath: 1,
                  name: 1,
              },
              graphId: 1,
              content: 1,
              imgPath: 1,
              reactions: 1,
              createdAt: 1,
          },
        },

        // Заполняем поле reactions
        {
          $lookup: {
            from: 'PostReaction', // PostReaction User
            localField: 'reactions', // Поле в моделе Post
            foreignField: '_id', // Поле в моделе PostReaction
            as: 'reactions', // Имя результирующего поля
          },
        },

        // Заполняем поле graphId
        {
          $lookup: {
            from: 'Graph', // PostReaction Graph
            localField: 'graphId', // Поле в моделе Post
            foreignField: '_id', // Поле в моделе PostReaction
            as: 'graphId', // Имя результирующего поля
          },
        },
        { $unwind: { path: '$graphId', preserveNullAndEmptyArrays: true } },

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
  
    try {
      // 1. Получаем основные посты с пользователями, реакциями и графами
      const posts = await this.PostModel.aggregate([
        // Сортируем по дате создания (сначала самые новые записи)
        { $sort: { createdAt: -1 } },
  
        // Пропускаем нужное количество записей
        { $skip: skipPosts },
  
        // Ограничиваем количество возвращаемых записей
        { $limit: DEFAULTLIMIT_POSTS },
  
        // Присоединяем пользователя
        {
          $lookup: {
            from: 'User',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
  
        // Присоединяем реакции
        {
          $lookup: {
            from: 'PostReaction',
            localField: 'reactions',
            foreignField: '_id',
            as: 'reactions',
          },
        },
  
        // Присоединяем графы
        {
          $lookup: {
            from: 'Graph',
            localField: 'graphId',
            foreignField: '_id',
            as: 'graphId',
          },
        },
        { $unwind: { path: '$graphId', preserveNullAndEmptyArrays: true } },
  
        // Проецируем необходимые поля
        {
          $project: {
            _id: 1,
            user: { _id: 1, name: 1, avaPath: 1 },
            graphId: 1,
            content: 1,
            imgPath: 1,
            reactions: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ]);
  
      // 2. Проверка на реакцию и подписку для каждого поста
      const postsWithReactionsAndSubs = await Promise.all(
        posts.map(async (post) => {
          // 2.1 Проверяем статус реакций для каждого поста
          const reactionsWithStatus = await Promise.all(
            post.reactions.map(async (reaction) => {
              const isReacted = await this.userPostReactionService.isUserReactionExists(
                reaction._id.toString(),
                userId.toString()
              );
              return {
                ...reaction,
                isReacted, // Добавляем поле isReacted
              };
            })
          );
  
          // 2.2 Проверяем, подписан ли пользователь на граф
          const isSubscribed = await this.graphSubsService.isUserSubsExists(
            post.graphId._id.toString(),
            userId.toString()
          );
  
          return {
            ...post,
            reactions: reactionsWithStatus,
            isSubscribed,
          };
        })
      );
  
      return postsWithReactionsAndSubs;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not fetch posts');
    }
  }
  

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

      // 2. Проверка на реакцию и подписку для каждого поста
      const postsWithReactionsAndSubs = await Promise.all(
        posts.map(async (post) => {
          // 2.1 Проверяем статус реакций для каждого поста
          const reactionsWithStatus = await Promise.all(
            post.reactions.map(async (reaction) => {
              const isReacted = await this.userPostReactionService.isUserReactionExists(
                reaction._id.toString(),
                userId.toString()
              );
              return {
                ...reaction,
                isReacted, // Добавляем поле isReacted
              };
            })
          );
  
          // 2.2 Проверяем, подписан ли пользователь на граф
          const isSubscribed = await this.graphSubsService.isUserSubsExists(
            post.graphId._id.toString(),
            userId.toString()
          );
  
          return {
            ...post,
            reactions: reactionsWithStatus,
            isSubscribed,
          };
        })
      );
  
      return postsWithReactionsAndSubs;

  }



  


}
