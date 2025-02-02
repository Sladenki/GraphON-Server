import { forwardRef, Module } from "@nestjs/common";

import { TypegooseModule } from "@m8a/nestjs-typegoose";
import { EventController } from "./event.controller";
import { EventService } from "./event.service";
import { EventModel } from "./event.model";


@Module({
  controllers: [EventController],
  providers: [EventService],
  imports: [
    TypegooseModule.forFeature([
      {
        typegooseClass: EventModel,
        schemaOptions: { collection: 'Event' }
      },
    ]),
  ],
  exports: [EventService]
})

export class EventModule {}