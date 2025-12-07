import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleController } from "./schedule.controller";
import { ScheduleService } from "./schedule.service";
import { ScheduleModel, ScheduleSchema } from "./schedule.model";
import { EventService } from "src/event/event.service";
import { EventModule } from "src/event/event.module";

@Module({
  controllers: [ScheduleController],
  providers: [ScheduleService],
  imports: [
    MongooseModule.forFeature([
      { name: ScheduleModel.name, schema: ScheduleSchema },
    ]),
    EventModule,
  ],
  exports: [ScheduleService]
})

export class ScheduleModule {}