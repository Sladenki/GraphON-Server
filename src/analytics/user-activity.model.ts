import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserActivityDocument = UserActivityModel & Document;

@Schema({
  collection: 'user_activities', // Название коллекции
  timestamps: false,
  versionKey: false,
})
export class UserActivityModel {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'UserModel', required: true, index: true })
  userId: Types.ObjectId;

  // Дата активности (только дата, без времени, для группировки)
  @Prop({ required: true, index: true })
  date: Date;

  // Количество запросов в этот день (опционально, для детальной аналитики)
  @Prop({ default: 1 })
  requestCount: number;

  // Первая активность в этот день
  @Prop({ required: true })
  firstSeenAt: Date;

  // Последняя активность в этот день
  @Prop({ required: true })
  lastSeenAt: Date;
}

export const UserActivitySchema = SchemaFactory.createForClass(UserActivityModel);

// Составной индекс для быстрого поиска по пользователю и дате
UserActivitySchema.index({ userId: 1, date: 1 }, { unique: true });

