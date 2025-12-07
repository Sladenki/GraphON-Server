import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AppDownloadDocument = AppDownloadModel & Document;

@Schema({
  collection: "app_downloads",
  timestamps: true,
  versionKey: false,
})
export class AppDownloadModel {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'UserModel' })
  userId?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const AppDownloadSchema = SchemaFactory.createForClass(AppDownloadModel);

