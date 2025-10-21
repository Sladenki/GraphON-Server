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

  // --- Создание расписания --- 
  async createSchedule(scheduleDto: CreateScheduleDto) {
    // Если передан массив дней, создаём сразу несколько расписаний
    if (Array.isArray(scheduleDto.dayOfWeek) && scheduleDto.dayOfWeek.length > 0) {
      const { dayOfWeek, ...rest } = scheduleDto;
      const docs = dayOfWeek.map((day: number) => ({ ...rest, dayOfWeek: day }));
      return this.ScheduleModel.insertMany(docs);
    }

    // Если передано одно число, создаём одно расписание
    const newSchedule = new this.ScheduleModel(scheduleDto);
    return newSchedule.save();
  }

  // --- Получает расписание для одного графа с понедельника по пятницу ---    
  async getWeekdaySchedulesByGraph(graphId: string) {
    return this.ScheduleModel
      .find({ graphId: graphId })
      .populate('graphId', 'name')
      .lean()
      .exec();
  }

  // --- Получает расписания для нескольких графов (все дни недели) ---    
  async getWeekdaySchedulesByGraphs(graphIds: string[]) {
    return this.ScheduleModel
    .find({
      graphId: { $in: graphIds },
      // Убрали фильтр по дням - теперь возвращает все дни недели (0-6)
    })
    .populate('graphId', 'name')
    .exec();
  }

}
