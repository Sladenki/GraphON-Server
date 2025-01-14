import { PostModel } from './post.model';
import { forwardRef, Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { TypegooseModule } from '@m8a/nestjs-typegoose';
import { UserModel } from 'src/user/user.model';
import { GraphModule } from 'src/graph/graph.module';
import { S3Module } from 'src/s3/s3.module';
import { PostReactionModule } from 'src/postReaction/postReaction.module';
import { UserPostReactionModule } from 'src/userPostReaction/userPostReaction.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getJwtConfig } from 'src/config/jwt.config';
import { GraphSubsModule } from 'src/graphSubs/graphSubs.module';
import { GraphSubsService } from 'src/graphSubs/graphSubs.service';

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
    S3Module,
    PostReactionModule,
    UserPostReactionModule,
    forwardRef(() => GraphSubsModule)
  ],
  exports: [PostService],
})
export class PostModule {}
