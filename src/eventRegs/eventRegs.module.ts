import { Module } from "@nestjs/common";
import { UserModel } from "src/user/user.model";

import { EventRegsController } from "./eventRegs.controller";
import { EventRegsService } from "./eventRegs.service";
import { EventRegsModel } from "./eventRegs.model";
import { EventModel } from "src/event/event.model";
import { GraphModel } from "src/graph/graph.model";
import { TypegooseModule } from "@m8a/nestjs-typegoose";
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

    TypegooseModule.forFeature([
      {
        typegooseClass: EventRegsModel,
        schemaOptions: { collection: 'EventRegs' }
      },
      {
        typegooseClass: UserModel,
        schemaOptions: { collection: 'User' }
      },
      {
        typegooseClass: EventModel,
        schemaOptions: { collection: 'Event' }
      },
      {
        typegooseClass: GraphModel,
        schemaOptions: { collection: 'Graph' }
      },
    ]),
  ],
  exports: [EventRegsService]
})
export class EventRegsModule {}