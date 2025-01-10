import { Injectable } from '@nestjs/common';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { Types } from 'mongoose';
import { UserPostReactionModel } from './userPostReaction.model';
import { PostReactionService } from 'src/postReaction/postReaction.service';

@Injectable()
export class UserPostReactionService {
  constructor(
    @InjectModel(UserPostReactionModel)
    private readonly userPostReactionModel: ModelType<UserPostReactionModel>,

    private readonly postReactionService: PostReactionService,
  ) {}

  // --- Связываем пользователя и реакцию ---
  async createUserAndReactionConnection(
    userId: Types.ObjectId,
    postReaction: string,
    postId: string,
    isReacted: boolean,
  ) {
    // console.log(userId, postReaction, postId, isReacted);

    if (!isReacted) {
      // Инкрементируем clickNum и создаем запись в БД
      await this.postReactionService.incrementClickNum(
        new Types.ObjectId(postId),
      );

      return await this.userPostReactionModel.create({
        user: userId,
        postReaction,
      });
    } else {
      // Декрементируем clickNum и удаляем запись из БД
      await this.postReactionService.decrementClickNum(
        new Types.ObjectId(postId),
      );

      const result = await this.userPostReactionModel.findOneAndDelete({
        user: userId,
        postReaction,
      });

      if (!result) {
        throw new Error(
          `User reaction with userId ${userId} and postId ${postId} not found`,
        );
      }

      return result;
    }
  }

  // async createUserAndReactionConnection(userId: Types.ObjectId, postReaction: string, postId: string, isReacted: boolean) {
  //     console.log('isReacted', isReacted);

  //     // Делает +1 к реакции
  //     await this.postReactionService.incrementClickNum(new Types.ObjectId(postId));

  //     return await this.userPostReactionModel.create({
  //         user: userId,
  //         postReaction
  //     });
  // }

  // --- Проверка наличия реакции пользователя ---
  async isUserReactionExists(
    reactionId: string,
    userId: string,
  ): Promise<boolean> {
    // console.log('isUserReactionExists', reactionId, userId)
    const reaction = await this.userPostReactionModel.findOne({
      postReaction: new Types.ObjectId(reactionId),
      user: new Types.ObjectId(userId),
    });

    // console.log('Есть реакция?', !!reaction)

    return !!reaction; // true, если реакция найдена; иначе false
  }


  // async findUserReactions(reactionIds: string[], userId: any) {
  //   const userReactions = await this.userPostReactionModel.find({
  //     reaction: { $in: reactionIds },
  //     user: userId,
  //   }).lean();

  //   return userReactions
  // } 

//   async areUserReactionsExist(reactionIds: string[], userId: string): Promise<Map<string, boolean>> {
//     const userReactions = await this.userPostReactionModel.find({
//         reaction: { $in: reactionIds },
//         user: userId,
//     }).lean();

//     const resultMap = new Map<string, boolean>();
//     reactionIds.forEach(reactionId => resultMap.set(reactionId, false)); // Инициализируем все значения как false

//     // @ts-expect-error 123
//     userReactions.forEach(reaction => resultMap.set(reaction.reaction.toString(), true)); // Устанавливаем true для найденных реакций

//     return resultMap;
// }


}
