import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationModel, NotificationDocument } from './notification.model';
import { NotificationType } from './notification-type.enum';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(NotificationModel.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async createFriendRequestNotification(params: { userId: Types.ObjectId; fromUserId: Types.ObjectId }) {
    await this.notificationModel.create({
      userId: params.userId,
      type: NotificationType.FRIEND_REQUEST,
      payload: { fromUserId: params.fromUserId },
      isRead: false,
    });
  }

  async createFriendAcceptedNotification(params: { userId: Types.ObjectId; fromUserId: Types.ObjectId }) {
    await this.notificationModel.create({
      userId: params.userId,
      type: NotificationType.FRIEND_ACCEPTED,
      payload: { fromUserId: params.fromUserId },
      isRead: false,
    });
  }
}


