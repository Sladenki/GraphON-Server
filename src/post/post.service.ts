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
    if (reactionObject) {
      // Если emoji пустое, установим значение по умолчанию
      const emoji = reactionObject.emoji || Emoji.LOVE;

      const reactionDto: any = {
        ...reactionObject,
        emoji,
        post: newPost._id.toString(), // Передаем ID созданного поста
      };

      try {
        await this.postReactionService.createPostReaction(reactionDto);
        console.log('Reaction created successfully');
      } catch (error) {
        console.error('Error creating reaction:', error);
      }
    }

    return newPost;
  }

  // --- Получение всех постов --- 
  async getPosts(skip: any, userId?: Types.ObjectId): Promise<any[]> {
    const skipPosts = skip ? Number(skip) : 0;

    const posts = await this.PostModel.find()
      .populate('user', 'name avaPath')
      .skip(skipPosts)
      .limit(DEFAULTLIMIT_POSTS)
      .sort({ createdAt: -1 })
      .lean(); // Преобразуем посты в обычные объекты

    const postsWithReactions = await Promise.all(
      posts.map(async (post) => {
        // Находим реакции для текущего поста и преобразуем их в обычные объекты
        const reactions = await this.postReactionService.findReactionsByPostId(
          post._id,
        );

        // Проверяем наличие реакции от пользователя для каждой реакции
        const reactionsWithUserStatus = await Promise.all(
          reactions.map(async (reaction) => {
            // console.log('reactionsWithUserStatus', 'called', userId)
            const isReacted = userId
              ? await this.userPostReactionService.isUserReactionExists(
                  reaction._id.toString(),
                  userId.toString(),
                )
              : false;

            return {
              _id: reaction._id,
              text: reaction.text,
              emoji: reaction.emoji,
              clickNum: reaction.clickNum,
              post: reaction.post,
              createdAt: reaction.createdAt,
              updatedAt: reaction.updatedAt,
              isReacted, // Добавляем статус реакции пользователя
            };
          }),
        );

        // Определяем isReacted на уровне поста как true, если хотя бы одна реакция от пользователя
        const postIsReacted = reactionsWithUserStatus.some(
          (reaction) => reaction.isReacted,
        );

        // console.log('postIsReacted', postIsReacted)

        // console.log('post', post)

        return {
          ...post,
          reactions: reactionsWithUserStatus,
          isReacted: postIsReacted,
        };
      }),
    );

    return postsWithReactions;
  }




}
