import { forwardRef, Module } from '@nestjs/common';
import { TypegooseModule } from '@m8a/nestjs-typegoose';
import { GraphController } from './graph.controller';
import { GraphModel } from './graph.model';
import { GraphSubsModel } from 'src/graphSubs/graphSubs.model';
import { GraphService } from './graph.service';
import { JwtStrategy } from 'src/user/jwt.strategy';
import { ConfigModule } from '@nestjs/config';
import { UserModel } from 'src/user/user.model';
import { GraphSubsModule } from 'src/graphSubs/graphSubs.module';
import { OptionalAuthGuard } from 'src/guards/optionalAuth.guard';
import { S3Module } from 'src/s3/s3.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  controllers: [GraphController],
  providers: [JwtStrategy, GraphService, OptionalAuthGuard],
  imports: [
    ConfigModule,
    S3Module,
    RedisModule,
    TypegooseModule.forFeature([
      {
        typegooseClass: GraphModel,
        schemaOptions: { collection: 'Graph' },
      },
      {
        typegooseClass: GraphSubsModel,
        schemaOptions: { collection: 'GraphSubs' },
      },
      {
        // Ссылка на модель пользователя
        typegooseClass: UserModel,
        // Название коллекции в БД
        schemaOptions: { collection: 'User' },
      },
    ]),
    forwardRef(() => GraphSubsModule)
  ],
  exports: [GraphService],
})
export class GraphModule {}
