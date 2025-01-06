import { PostModel } from './post.model';
import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { TypegooseModule } from '@m8a/nestjs-typegoose';
import { UserModel } from 'src/user/user.model';
import { GraphModule } from 'src/graph/graph.module';
import { PostTagModule } from 'src/postTag/postTag.module';
import { TaggedPostModule } from 'src/taggedPost/taggedPost.module';
import { PythonModule } from 'src/microservice/python.module';
import { S3Module } from 'src/s3/s3.module';
import { PostReactionModule } from 'src/postReaction/postReaction.module';
import { UserPostReactionModule } from 'src/userPostReaction/userPostReaction.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getJwtConfig } from 'src/config/jwt.config';

@Module({
  controllers: [PostController],
  providers: [PostService],
  imports: [

    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),

    TypegooseModule.forFeature([
      {
        typegooseClass: PostModel,
        schemaOptions: { collection: 'Post' },
      },
      {
        typegooseClass: UserModel,
        schemaOptions: { collection: 'User' },
      },
    ]),
    GraphModule,
    PostTagModule,
    TaggedPostModule,
    PythonModule,
    S3Module,
    PostReactionModule,
    UserPostReactionModule,
  ],
  exports: [PostService],
})
export class PostModule {}
