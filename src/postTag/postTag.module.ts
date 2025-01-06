import { Module } from '@nestjs/common';
import { TypegooseModule } from '@m8a/nestjs-typegoose';
import { PostTagController } from './postTag.contoller';
import { PostTagService } from './postTag.service';
import { PostTagModel } from './postTag.model';

@Module({
  controllers: [PostTagController],
  providers: [PostTagService],
  imports: [
    TypegooseModule.forFeature([
      {
        typegooseClass: PostTagModel,
        schemaOptions: { collection: 'PostTag' },
      },
    ]),
  ],
  exports: [PostTagService],
})
export class PostTagModule {}
