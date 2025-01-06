import { Injectable } from '@nestjs/common';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { userSubsModel } from './userSubs.model';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { UserModel } from 'src/user/user.model';
import { Types } from 'mongoose';

@Injectable()
export class UserSubsService {
  constructor(
    @InjectModel(userSubsModel)
    private readonly userSubsModel: ModelType<userSubsModel>,

    @InjectModel(UserModel)
    private readonly UserModel: ModelType<UserModel>,
  ) {}

  // Подписываемся на пользователя
  async toggleSubs(
    fromUser: string | Types.ObjectId,
    toUser: string | Types.ObjectId,
  ) {
    // Нельзя подписаться на себя
    if (String(fromUser) === String(toUser)) return;

    // Проверяем, существует ли уже объект
    const isUserSubscribed = await this.userSubsModel
      .findOne({ fromUser, toUser })
      .exec();

    if (isUserSubscribed) {
      // Если существует, то удаляем его и обновляем счётчики
      await Promise.all([
        this.UserModel.findOneAndUpdate(
          { _id: fromUser },
          { $inc: { subsNum: -1 } },
        ).exec(),
        this.UserModel.findOneAndUpdate(
          { _id: toUser },
          { $inc: { followersNum: -1 } },
        ).exec(),
        this.userSubsModel.deleteOne({ fromUser, toUser }),
      ]);
    } else {
      // Создаём новый объект, если его ещё нет, и обновляем счётчики
      await Promise.all([
        this.UserModel.findOneAndUpdate(
          { _id: fromUser },
          { $inc: { subsNum: 1 } },
        ).exec(),
        this.UserModel.findOneAndUpdate(
          { _id: toUser },
          { $inc: { followersNum: 1 } },
        ).exec(),
        this.userSubsModel.create({ fromUser, toUser }),
      ]);
    }
  }

  // Подписываемся на пользователя с транзакциями
  // async toggleSubs(fromUser: string | Types.ObjectId, toUser: string | Types.ObjectId) {
  //     // Нельзя подписаться на себя
  //     if (String(fromUser) === String(toUser)) return;

  //     const session = await this.userSubsModel.startSession();
  //     session.startTransaction();

  //     try {
  //         // Проверяем, существует ли уже объект
  //         const isUserSubscribed = await this.userSubsModel.findOne({ fromUser, toUser }).session(session).exec();

  //         if (isUserSubscribed) {
  //             // Если существует, то удаляем его и обновляем счётчики
  //             await Promise.all([
  //                 this.UserModel.findOneAndUpdate({ _id: fromUser }, { $inc: { subsNum: -1 } }).session(session).exec(),
  //                 this.UserModel.findOneAndUpdate({ _id: toUser }, { $inc: { followersNum: -1 } }).session(session).exec(),
  //                 this.userSubsModel.deleteOne({ fromUser, toUser }).session(session)
  //             ]);
  //         } else {
  //             // Создаём новый объект, если его ещё нет, и обновляем счётчики
  //             await Promise.all([
  //                 this.UserModel.findOneAndUpdate({ _id: fromUser }, { $inc: { subsNum: 1 } }).session(session).exec(),
  //                 this.UserModel.findOneAndUpdate({ _id: toUser }, { $inc: { followersNum: 1 } }).session(session).exec(),
  //                 this.userSubsModel.create([{ fromUser, toUser }], { session })
  //             ]);
  //         }

  //         await session.commitTransaction();
  //     } catch (error) {
  //         await session.abortTransaction();
  //         throw error;
  //     } finally {
  //         session.endSession();
  //     }
  // }

  // 3
  // async toggleSubs(fromUser: string | Types.ObjectId, toUser: string | Types.ObjectId) {
  //     if (String(fromUser) === String(toUser)) return;

  //     // Проверяем, существует ли уже объект
  //     const isUserSubscribed = await this.userSubsModel.findOne({ fromUser, toUser }).exec();

  //     const updateOptions = { new: true, upsert: true }; // Добавить, если не существует

  //     if (isUserSubscribed) {
  //       await this.UserModel.findOneAndUpdate({ _id: fromUser }, { $inc: { subsNum: -1 } }, updateOptions).exec();
  //       await this.UserModel.findOneAndUpdate({ _id: toUser }, { $inc: { followersNum: -1 } }, updateOptions).exec();
  //       await this.userSubsModel.deleteOne({ fromUser, toUser });
  //     } else {
  //       await this.UserModel.findOneAndUpdate({ _id: fromUser }, { $inc: { subsNum: 1 } }, updateOptions).exec();
  //       await this.UserModel.findOneAndUpdate({ _id: toUser }, { $inc: { followersNum: 1 } }, updateOptions).exec();
  //       await this.userSubsModel.create({ fromUser, toUser });
  //     }
  //   }
}
