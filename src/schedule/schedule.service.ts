import { InjectModel } from "@nestjs/mongoose";
import { Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { ScheduleModel, ScheduleDocument } from "./schedule.model";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { Types } from "mongoose";


@Injectable()
export class ScheduleService {
  constructor(
    @InjectModel(ScheduleModel.name) 
    private readonly scheduleModel: Model<ScheduleDocument>,
  ) {}

  // --- Создание расписания --- 
  async createSchedule(scheduleDto: CreateScheduleDto) {
    // graphId в DTO приходит как строка → конвертируем в ObjectId
    if (!scheduleDto.graphId || !Types.ObjectId.isValid(scheduleDto.graphId)) {
      // Не импортируем HttpException/HttpStatus здесь, чтобы не менять структуру файла;
      // при невалидном ID Mongo сама бросит ошибку, но базовую проверку на наличие делаем.
      throw new Error('Invalid graphId for schedule'); 
    }

    const graphObjectId = new Types.ObjectId(scheduleDto.graphId);

    // Если передан массив дней, создаём сразу несколько расписаний
    if (Array.isArray(scheduleDto.dayOfWeek) && scheduleDto.dayOfWeek.length > 0) {
      const { dayOfWeek, ...rest } = scheduleDto;
      const docs = dayOfWeek.map((day: number) => ({
        ...rest,
        graphId: graphObjectId,
        dayOfWeek: day,
      }));
      return this.scheduleModel.insertMany(docs);
    }

    // Если передано одно число, создаём одно расписание
    const newSchedule = new this.scheduleModel({
      ...scheduleDto,
      graphId: graphObjectId,
    });
    return newSchedule.save();
  }

  // --- Получает расписание для одного графа с понедельника по пятницу ---    
  async getWeekdaySchedulesByGraph(graphId: string | Types.ObjectId) {
    // Преобразуем graphId в ObjectId для корректного поиска в БД
    const graphObjectId = typeof graphId === 'string' ? new Types.ObjectId(graphId) : graphId;
    
    return (this.scheduleModel.find as any)({ graphId: graphObjectId })
      .populate('graphId', 'name')
      .lean()
      .exec();
  }

  // --- Получает расписания для нескольких графов (все дни недели) ---    
  async getWeekdaySchedulesByGraphs(graphIds: string[] | Types.ObjectId[]) {
    // Преобразуем все graphIds в ObjectId для корректного поиска в БД
    const graphObjectIds = graphIds.map(id => 
      typeof id === 'string' ? new Types.ObjectId(id) : id
    );
    
    return (this.scheduleModel.find as any)({
      graphId: { $in: graphObjectIds },
      // Убрали фильтр по дням - теперь возвращает все дни недели (0-6)
    })
    .populate('graphId', 'name')
    .exec();
  }

}
