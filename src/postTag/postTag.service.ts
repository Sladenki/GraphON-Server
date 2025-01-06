import { Injectable } from '@nestjs/common';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { PostTagModel } from './postTag.model';
import { ModelType } from '@typegoose/typegoose/lib/types';

@Injectable()
export class PostTagService {
  constructor(
    @InjectModel(PostTagModel)
    private readonly postTagModel: ModelType<PostTagModel>,
  ) {}

  // --- Создание нового тэга ---
  async createPostTag(names: string[]) {
    return await Promise.all(
      names.map(async (name) => {
        return this.postTagModel
          .findOneAndUpdate(
            { name }, // Условие поиска по названию тега
            { $inc: { postsNum: 1 } }, // Увеличение `postsNum` на 1, если тег уже существует
            { new: true, upsert: true, setDefaultsOnInsert: true }, // Создать новый тег, если не найден
          )
          .exec();
      }),
    );
  }
}
