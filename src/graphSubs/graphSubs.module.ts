import { Module } from "@nestjs/common";
import { GraphSubsController } from "./graphSubs.controller";
import { TypegooseModule } from "@m8a/nestjs-typegoose";
import { GraphSubsModel } from "./graphSubs.model";
import { GraphSubsService } from "./graphSubs.service";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { getJwtConfig } from "src/config/jwt.config";
import { PostModule } from "src/post/post.module";


@Module({
  controllers: [GraphSubsController],
  providers: [GraphSubsService],
  imports: [

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),

    TypegooseModule.forFeature([
      {
        typegooseClass: GraphSubsModel,
        schemaOptions: { collection: 'GraphSubs' }
      },
    ]),
    PostModule
  ]
})

export class GraphSubsModule {}