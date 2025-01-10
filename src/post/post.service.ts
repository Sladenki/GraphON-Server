import { Inject, Injectable } from '@nestjs/common';
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
import { CreateGraphDto } from 'src/graph/dto/create-graph.dto';

@Injectable()
export class PostService {
  constructor(
    @InjectModel(PostModel)
    private readonly PostModel: ModelType<PostModel>,

    @InjectModel(UserModel)
    private readonly UserModel: ModelType<UserModel>,

    // Redis
    // @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,

    // Выделения ключевых слов

    private readonly graphService: GraphService,

    private readonly s3Service: S3Service,

    private readonly postReactionService: PostReactionService,

    private readonly userPostReactionService: UserPostReactionService,
  ) {}

  // --- Создание поста ---
  async createPost(dto: CreatePostDto, creatorId: Types.ObjectId) {
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

    const userId = creatorId.toString();

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
      ...(childGraphId && { graphId: childGraphId }),
      // graphId: graph._id,
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

  // --- Получение всех постов ---
  async getPostsNoAuth(skip: any): Promise<any[]> {
    const skipPosts = skip ? Number(skip) : 0;
  
    // Получаем посты, как и раньше
    const posts = await this.PostModel.find()
      .populate('user', 'name avaPath')
      .skip(skipPosts)
      .limit(DEFAULTLIMIT_POSTS)
      .sort({ createdAt: -1 })
      .lean(); // Преобразуем посты в обычные объекты
  
    // Для каждого поста обрабатываем реакции
    const postsWithReactions = await Promise.all(
      posts.map(async (post) => {
        const postReactions = post.reactions

        console.log('postReactions', postReactions)
  
        // Проверяем наличие реакции от пользователя для каждой реакции
        const reactionsWithUserStatus = await Promise.all(
          postReactions.map(async (reaction: any) => {

            return {
              _id: reaction._id,
              text: reaction.text,
              emoji: reaction.emoji,
              clickNum: reaction.clickNum,
              post: reaction.post,
              createdAt: reaction.createdAt,
              updatedAt: reaction.updatedAt,
            };
          }),
        );
  
        return {
          ...post,
          reactions: reactionsWithUserStatus,
        };
      }),
    );
  
    return postsWithReactions;
  }

  // --- Получение всех постов для авторизованного пользователя --- 
  async getPostsAuth(skip: any, userId?: Types.ObjectId): Promise<any[]> {
    // console.log('userId', userId)

    const skipPosts = skip ? Number(skip) : 0;
  
    // Получаем посты, как и раньше
    const posts = await this.PostModel.find()
      .populate('user', 'name avaPath')
      .populate('reactions', '_id text emoji clickNum')
      .skip(skipPosts)
      .limit(DEFAULTLIMIT_POSTS)
      .sort({ createdAt: -1 })
      .lean(); // Преобразуем посты в обычные объекты

      // console.log('posts', posts)

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
