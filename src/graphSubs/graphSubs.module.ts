import { forwardRef, Module } from "@nestjs/common";
import { GraphSubsController } from "./graphSubs.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { GraphSubsModel, GraphSubsSchema } from "./graphSubs.model";
import { EventRegsModel, EventRegsSchema } from "src/eventRegs/eventRegs.model";
import { GraphSubsService } from "./graphSubs.service";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { getJwtConfig } from "src/config/jwt.config";
import { ScheduleModule } from "src/schedule/schedule.module";
import { GraphModel, GraphSchema } from "src/graph/graph.model";
import { EventModule } from "src/event/event.module";
import { EventRegsModule } from "src/eventRegs/eventRegs.module";
import { UserModel, UserSchema } from "src/user/user.model";
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

    MongooseModule.forFeature([
      { name: GraphSubsModel.name, schema: GraphSubsSchema },
      { name: GraphModel.name, schema: GraphSchema },
      { name: UserModel.name, schema: UserSchema },
      { name: EventRegsModel.name, schema: EventRegsSchema },
    ]),
    ScheduleModule,
    EventModule,
    EventRegsModule,
    RedisModule
  ],
  exports: [GraphSubsService]
})

export class GraphSubsModule {}