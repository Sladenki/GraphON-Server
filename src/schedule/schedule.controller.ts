import { Body, Controller, Get, Post } from "@nestjs/common";
import { ScheduleService } from "./schedule.service";
import { CreateScheduleDto } from "./dto/create-schedule.dto";


@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // --- Создание --- 
  @Post('create')
  async createSchedule(
    @Body() body: CreateScheduleDto
  ) {
    return this.scheduleService.createSchedule(body)
  }

  // --- Получает расписание для одного графа с понедельника по пятницу ---    
  @Post('weekday-by-graph')
  async getWeeklyScheduleByGraphId(
    @Body() body: { graphId: string },
  ) {
    const { graphId } = body;
    return this.scheduleService.getWeekdaySchedulesByGraph(graphId);
  }

  // --- Получает расписания для нескольких графов с понедельника по пятницу ---   
  // --- Для вкладки расписания ---  
  @Get('weekday-all')
  async getWeekdaySchedulesByGraphs(
    @Body() body: { graphIds: string[] },
  ) {
    const { graphIds } = body;
    return this.scheduleService.getWeekdaySchedulesByGraphs(graphIds);
  }


}
