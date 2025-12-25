import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RelationshipStatus } from './relationship-status.enum';

export type RelationshipDocument = RelationshipModel & Document;

@Schema({
  collection: 'relationships',
  versionKey: false,
  timestamps: true,
})
export class RelationshipModel {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  requesterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  targetId: Types.ObjectId;

  @Prop({ type: String, enum: RelationshipStatus, required: true })
  status: RelationshipStatus;

  createdAt: Date;
  updatedAt: Date;
}

export const RelationshipSchema = SchemaFactory.createForClass(RelationshipModel);

// Prevent duplicates per direction (one doc = one direction)
RelationshipSchema.index({ requesterId: 1, targetId: 1 }, { unique: true });

// Query-optimized indexes for lists
RelationshipSchema.index({ requesterId: 1, status: 1, targetId: 1 });
RelationshipSchema.index({ targetId: 1, status: 1, requesterId: 1 });


