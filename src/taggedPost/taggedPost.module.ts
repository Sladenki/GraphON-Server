import { Module } from '@nestjs/common';
import { TypegooseModule } from '@m8a/nestjs-typegoose';
import { PostModel } from 'src/post/post.model';
import { PostTagModel } from 'src/postTag/postTag.model';
import { TaggedPostController } from './taggedPost.controller';
import { TaggedPostService } from './taggedPost.service';
import { TaggedPostModel } from './taggedPost.model';

@Module({
  controllers: [TaggedPostController],
  providers: [TaggedPostService],
  imports: [
    TypegooseModule.forFeature([
      {
        typegooseClass: TaggedPostModel,
        schemaOptions: { collection: 'TaggedPost' },
      },
      {
        typegooseClass: PostModel,
        schemaOptions: { collection: 'Post' },
      },
      {
        typegooseClass: PostTagModel,
        schemaOptions: { collection: 'PostTag' },
      },
    ]),
  ],
  exports: [TaggedPostService],
})
export class TaggedPostModule {}
