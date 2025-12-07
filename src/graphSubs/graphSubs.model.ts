import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GraphSubsDocument = GraphSubsModel & Document;

// TimeStamps - даты
@Schema({
    collection: 'GraphSubs',
    timestamps: false, // Отключает поля createdAt и updatedAt
    versionKey: false,  // Отключает поле _v
})
export class GraphSubsModel {
    _id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'UserModel', index: true })
    user: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: 'GraphModel', index: true })
    graph: Types.ObjectId

}

export const GraphSubsSchema = SchemaFactory.createForClass(GraphSubsModel);

// Составной индекс для оптимизации поиска по обоим полям
GraphSubsSchema.index({ user: 1, graph: 1 });


