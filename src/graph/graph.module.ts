import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GraphController } from './graph.controller';
import { GraphModel, GraphSchema } from './graph.model';
import { GraphSubsModel, GraphSubsSchema } from 'src/graphSubs/graphSubs.model';
import { GraphService } from './graph.service';
import { JwtStrategy } from 'src/user/jwt.strategy';
import { ConfigModule } from '@nestjs/config';
import { UserModel, UserSchema } from 'src/user/user.model';
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
    MongooseModule.forFeature([
      { name: GraphModel.name, schema: GraphSchema },
      { name: GraphSubsModel.name, schema: GraphSubsSchema },
      { name: UserModel.name, schema: UserSchema },
    ]),
    forwardRef(() => GraphSubsModule)
  ],
  exports: [GraphService],
})
export class GraphModule {}
