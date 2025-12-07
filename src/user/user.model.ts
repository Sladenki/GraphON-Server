import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = UserModel & Document;

@Schema({
  collection: 'User',
  versionKey: false, // Отключает поле _v
  timestamps: { createdAt: true, updatedAt: false }, // Оставляет createdAt, но убирает updatedAt
})
export class UserModel {
  _id: Types.ObjectId;

  @Prop({ enum: ['create', 'admin', 'editor', 'sysadmin', 'user'], default: 'user' })
  role: 'create' | 'admin' | 'editor' | 'sysadmin' | 'user';

  // Калининград (больше для локалки)
  @Prop({ type: Types.ObjectId, ref: 'GraphModel', index: true, default: null })
  selectedGraphId: Types.ObjectId; 

  // КГТУ \ КБК
  @Prop({ type: Types.ObjectId, ref: 'GraphModel', index: true, default: null })
  universityGraphId: Types.ObjectId; 

  // Список графов, которыми управляет пользователь (по сути, где он владелец)
  @Prop({ type: [{ type: Types.ObjectId, ref: 'GraphModel' }], default: undefined })
  managedGraphIds?: Types.ObjectId[];

  @Prop()
  firstName: string

  @Prop()
  lastName: string

  @Prop()
  username: string

  @Prop()
  avaPath: string

  @Prop()
  telegramId: string

  @Prop({ enum: ['male', 'female'], required: false })
  gender?: 'male' | 'female'

  @Prop({ required: false })
  birthDate?: Date

  @Prop({ default: 0 })
  // subsNum: number  // подписки на граф
  graphSubsNum: number

  @Prop({ default: 0 })
  postsNum: number 

  @Prop({ default: 0 })
  attentedEventsNum: number

  // Поля для соглашения об авторских правах
  @Prop({ default: false })
  copyrightAgreementAccepted: boolean

  @Prop()
  copyrightAgreementAcceptedAt: Date

  // Поле для отслеживания активности пользователя
  @Prop()
  lastActivityDate?: Date

  @Prop()
  isStudent?: boolean

  createdAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserModel);