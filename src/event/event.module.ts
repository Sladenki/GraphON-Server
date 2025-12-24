import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EventController } from "./event.controller";
import { EventService } from "./event.service";
import { EventModel, EventSchema } from "./event.model";
import { EventRegsModel, EventRegsSchema } from "src/eventRegs/eventRegs.model";
import { EventRegsModule } from "src/eventRegs/eventRegs.module";
import { ConfigModule } from "@nestjs/config";
import { GraphModel, GraphSchema } from "src/graph/graph.model";

@Module({
  controllers: [EventController],
  providers: [EventService],
  imports: [
    MongooseModule.forFeature([
      { name: EventModel.name, schema: EventSchema },
      { name: EventRegsModel.name, schema: EventRegsSchema },
      { name: GraphModel.name, schema: GraphSchema },
    ]),
    EventRegsModule,
  ],
  exports: [EventService]
})

export class EventModule {}