import { Module } from "@nestjs/common";
import { TypegooseModule } from "@m8a/nestjs-typegoose";
import { ScheduleController } from "./schedule.controller";
import { ScheduleService } from "./schedule.service";
import { ScheduleModel } from "./schedule.model";


@Module({
  controllers: [ScheduleController],
  providers: [ScheduleService],
  imports: [
    TypegooseModule.forFeature([
      {
        typegooseClass: ScheduleModel,
        schemaOptions: { collection: 'Schedule' }
      },
    ]),
  ]
})

export class ScheduleModule {}