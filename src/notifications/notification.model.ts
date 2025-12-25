import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { NotificationType } from './notification-type.enum';

export type NotificationDocument = NotificationModel & Document;

@Schema({
  collection: 'notifications',
  versionKey: false,
  timestamps: true,
})
export class NotificationModel {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({
    type: {
      fromUserId: { type: Types.ObjectId, required: true },
    },
    required: true,
    _id: false,
  })
  payload: { fromUserId: Types.ObjectId };

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(NotificationModel);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });


