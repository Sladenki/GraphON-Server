import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RequestsConnectedGraphDocument = RequestsConnectedGraphModel & Document;

@Schema({
    collection: 'requests_connected_graph',
    timestamps: true, // Включает поля createdAt и updatedAt
    versionKey: false  // Отключает поле _v
})
export class RequestsConnectedGraphModel {
    _id: Types.ObjectId;

    // Пользователь, который сделал запрос (опционально, если пользователь не авторизован)
    @Prop({ type: Types.ObjectId, ref: 'UserModel', required: false, index: true })
    userId?: Types.ObjectId;

    // Название вуза
    @Prop({ required: true })
    university: string;

    createdAt: Date;
    updatedAt: Date;
}

export const RequestsConnectedGraphSchema = SchemaFactory.createForClass(RequestsConnectedGraphModel);

