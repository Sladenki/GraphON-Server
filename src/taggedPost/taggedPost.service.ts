import { Injectable } from '@nestjs/common';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { TaggedPostModel } from './taggedPost.model';
import { Types } from 'mongoose';

@Injectable()
export class TaggedPostService {
  constructor(
    @InjectModel(TaggedPostModel)
    private readonly taggedPostModel: ModelType<TaggedPostModel>,
  ) {}

  // --- Создание связи между тегом и постом ---
  async createTaggedPost(postId: Types.ObjectId, postTagId: Types.ObjectId) {
    return await this.taggedPostModel.create({ postId, postTagId });
  }
}
