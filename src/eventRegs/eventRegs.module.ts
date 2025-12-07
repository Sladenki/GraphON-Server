import { Module } from "@nestjs/common";
import { UserModel, UserSchema } from "src/user/user.model";

import { EventRegsController } from "./eventRegs.controller";
import { EventRegsService } from "./eventRegs.service";
import { EventRegsModel, EventRegsSchema } from "./eventRegs.model";
import { EventModel, EventSchema } from "src/event/event.model";
import { GraphModel, GraphSchema } from "src/graph/graph.model";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { getJwtConfig } from "src/config/jwt.config";


@Module({
  controllers: [EventRegsController],
  providers: [EventRegsService],
  imports: [
    // Нужно так как используем декоратор Auth()
    ConfigModule,

    JwtModule.registerAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: getJwtConfig,
    }),

    MongooseModule.forFeature([
      { name: EventRegsModel.name, schema: EventRegsSchema },
      { name: UserModel.name, schema: UserSchema },
      { name: EventModel.name, schema: EventSchema },
      { name: GraphModel.name, schema: GraphSchema },
    ]),
  ],
  exports: [EventRegsService]
})
export class EventRegsModule {}