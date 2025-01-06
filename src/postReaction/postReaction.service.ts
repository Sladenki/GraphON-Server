import { Injectable } from '@nestjs/common';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { PostReactionModel } from './postReaction.model';
import { CreatePostReactionDto } from './dto/createPostReaction.dto';
import { Types } from 'mongoose';

@Injectable()
export class PostReactionService {
  constructor(
    @InjectModel(PostReactionModel)
    private readonly postReactionModel: ModelType<PostReactionModel>,
  ) {}

  // --- Создание реакции на пост ---
  async createPostReaction(dto: CreatePostReactionDto) {
    return await this.postReactionModel.create(dto);
  }

  // --- Поиск реакций по ID поста ---
  async findReactionsByPostId(postId: Types.ObjectId) {
    const reactions = await this.postReactionModel.find({ post: postId });

    return reactions;
  }

  // --- Увеличение clickNum на 1 для определенной реакции ---
  async incrementClickNum(postId: Types.ObjectId) {
    const reaction = await this.postReactionModel.findOneAndUpdate(
      { post: postId },
      { $inc: { clickNum: 1 } }, // Увеличиваем clickNum на 1
      { new: true }, // Возвращаем обновленный документ
    );

    if (!reaction) {
      throw new Error(`Reaction with postId ${postId} not found`);
    }

    return reaction;
  }

  // --- Уменьшение clickNum на 1 для определенной реакции ---
  async decrementClickNum(postId: Types.ObjectId) {
    const reaction = await this.postReactionModel.findOneAndUpdate(
      { post: postId },
      { $inc: { clickNum: -1 } }, // Уменьшаем clickNum на 1
      { new: true }, // Возвращаем обновленный документ
    );

    if (!reaction) {
      throw new Error(`Reaction with postId ${postId} not found`);
    }

    return reaction;
  }
}
