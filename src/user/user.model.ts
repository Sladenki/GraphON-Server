import { modelOptions, prop, Ref } from "@typegoose/typegoose";
import { Base, TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { GraphModel } from "src/graph/graph.model";

// Base - уникальные id 
export interface UserModel extends Base {}

@modelOptions({
  schemaOptions: {
    versionKey: false, // Отключает поле _v
    timestamps: { createdAt: true, updatedAt: false }, // Оставляет createdAt, но убирает updatedAt
  },
})
export class UserModel extends TimeStamps {

  @prop({ enum: ['create', 'admin', 'editor', 'sysadmin', 'user'], default: 'user' })
  role: 'create' | 'admin' | 'editor' | 'sysadmin' | 'user';

  @prop ({ ref: () => GraphModel, index: true, default: null })
  selectedGraphId: Ref<GraphModel>; 

  // Список графов, которыми управляет пользователь (по сути, где он владелец)
  @prop({ ref: () => GraphModel, type: () => [GraphModel], default: undefined })
  managedGraphIds?: Ref<GraphModel>[];

  @prop()
  firstName: string

  @prop()
  lastName: string

  @prop()
  username: string

  @prop()
  avaPath: string

  @prop()
  telegramId: string

  @prop({ enum: ['male', 'female'], required: false })
  gender?: 'male' | 'female'

  @prop({ required: false })
  birthDate?: Date

  @prop({ default: 0 })
  // subsNum: number  // подписки на граф
  graphSubsNum: number

  @prop({ default: 0 })
  postsNum: number 

  @prop({ default: 0 })
  attentedEventsNum: number

  // Поля для соглашения об авторских правах
  @prop({ default: false })
  copyrightAgreementAccepted: boolean

  @prop()
  copyrightAgreementAcceptedAt: Date

}