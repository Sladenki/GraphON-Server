import { InjectModel } from "@m8a/nestjs-typegoose";
import { Injectable } from "@nestjs/common";
import { ScheduleModel } from "./schedule.model";
import { ModelType } from "@typegoose/typegoose/lib/types";
import { CreateScheduleDto } from "./dto/create-schedule.dto";


@Injectable()
export class ScheduleService {
  constructor(
    @InjectModel(ScheduleModel) 
    private readonly ScheduleModel: ModelType<ScheduleModel>,
  ) {}

  // --- Создание --- 
  async createSchedule(scheduleDto: CreateScheduleDto) {
    const newSchedule = new this.ScheduleModel(scheduleDto);
    return newSchedule.save();
  }

  // --- Получает расписание для одного графа с понедельника по пятницу ---    
  async getWeekdaySchedulesByGraph(graphId: string) {
    const schedule = this.ScheduleModel
    .find({ graphId: graphId })
    .populate('graphId', 'name')
    .exec();

    return schedule
  }

  // --- Получает расписания для нескольких графов с понедельника по пятницу ---    
  async getWeekdaySchedulesByGraphs(graphIds: string[]) {
    return this.ScheduleModel
    .find({
      graphId: { $in: graphIds },
      dayOfWeek: { $gte: 0, $lte: 4 }, // Понедельник - Пятница
    })
    .populate('graphId', 'name')
    .exec();
  }

}
