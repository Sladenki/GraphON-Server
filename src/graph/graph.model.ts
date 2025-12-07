import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GraphDocument = GraphModel & Document;

@Schema({
    collection: 'Graph',
    timestamps: false, // Отключает поля createdAt и updatedAt
    versionKey: false  // Отключает поле _v
})
export class GraphModel {
    _id: Types.ObjectId;

    @Prop({ enum: ["global", "topic", "default"], required: true, index: true })
    graphType: "global" | "topic" | "default";

    @Prop({ type: Types.ObjectId, ref: 'GraphModel', index: true })
    globalGraphId?: Types.ObjectId;

    @Prop()
    name: string

    @Prop()
    city?: string

    @Prop({ index: false, maxlength: 200 })
    about?: string

    @Prop({ type: Types.ObjectId, ref: 'UserModel', index: true })
    ownerUserId: Types.ObjectId; 

    // Количество подписчиков на граф
    @Prop({ default: 0 })
    subsNum: number

    @Prop({ type: Types.ObjectId, ref: 'GraphModel', index: true })
    parentGraphId?: Types.ObjectId; 

    @Prop({ default: 0, index: false })
    childGraphNum: number;

    @Prop()
    imgPath?: string

    @Prop({ index: false })
    directorName?: string

    @Prop({ index: false })
    directorVkLink?: string
    
    // Ссылка на страницу в VK
    @Prop({ index: false })
    vkLink?: string

    // Ссылка на сайт
    @Prop()
    websiteLink?: string
}

export const GraphSchema = SchemaFactory.createForClass(GraphModel);


