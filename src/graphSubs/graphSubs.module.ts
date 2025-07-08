import { forwardRef, Module } from "@nestjs/common";
import { GraphSubsController } from "./graphSubs.controller";
import { TypegooseModule } from "@m8a/nestjs-typegoose";
import { GraphSubsModel } from "./graphSubs.model";
import { EventRegsModel } from "src/eventRegs/eventRegs.model";
import { GraphSubsService } from "./graphSubs.service";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { getJwtConfig } from "src/config/jwt.config";
import { ScheduleModule } from "src/schedule/schedule.module";
import { GraphModel } from "src/graph/graph.model";
import { EventModule } from "src/event/event.module";
import { EventRegsModule } from "src/eventRegs/eventRegs.module";
import { UserModel } from "src/user/user.model";
import { RedisModule } from "src/redis/redis.module";


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
      {
        typegooseClass: GraphModel,
        schemaOptions: { collection: 'Graph' }
      },
      {
        typegooseClass: UserModel,
        schemaOptions: { collection: 'User' }
      },
      {
        typegooseClass: EventRegsModel,
        schemaOptions: { collection: 'EventRegs' }
      },
    ]),
    ScheduleModule,
    EventModule,
    EventRegsModule,
    RedisModule
  ],
  exports: [GraphSubsService]
})

export class GraphSubsModule {}