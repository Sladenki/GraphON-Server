import { modelOptions, prop, Ref, index } from "@typegoose/typegoose";
import { Base, TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { UserModel } from "src/user/user.model";

// Base - уникальные id 
export interface UserActivityModel extends Base {}

// Составной индекс для быстрого поиска по пользователю и дате
@index({ userId: 1, date: 1 }, { unique: true })
@modelOptions({
  schemaOptions: {
    timestamps: false,
    versionKey: false,
    collection: 'user_activities' // Название коллекции
  }
})
export class UserActivityModel extends TimeStamps {
  @prop({ ref: () => UserModel, required: true, index: true })
  userId: Ref<UserModel>;

  // Дата активности (только дата, без времени, для группировки)
  @prop({ required: true, index: true })
  date: Date;

  // Количество запросов в этот день (опционально, для детальной аналитики)
  @prop({ default: 1 })
  requestCount: number;

  // Первая активность в этот день
  @prop({ required: true })
  firstSeenAt: Date;

  // Последняя активность в этот день
  @prop({ required: true })
  lastSeenAt: Date;
}

