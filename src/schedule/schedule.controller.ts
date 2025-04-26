import { Body, Controller, Get, Post, HttpException, HttpStatus } from "@nestjs/common";
import { ScheduleService } from "./schedule.service";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { EventService } from "src/event/event.service";
import { Types } from "mongoose";

interface FullScheduleResponse {
  schedule: any[];
  events: any[];
}

@Controller('schedule')
export class ScheduleController {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly eventService: EventService
  ) {}

  // --- Создание --- 
  @Post('create')
  async createSchedule(
    @Body() body: CreateScheduleDto
  ) {
    return this.scheduleService.createSchedule(body)
  }

  // --- Получает расписание для одного графа с понедельника по пятницу + мероприятия ---
  @Post("full-by-graph")
  async getFullScheduleByGraphId(
    @Body() body: { graphId: string }
  ): Promise<FullScheduleResponse> {
    if (!body.graphId || !Types.ObjectId.isValid(body.graphId)) {
      throw new HttpException('Invalid graphId', HttpStatus.BAD_REQUEST);
    }

    try {
      const [schedule, events] = await Promise.all([
        this.scheduleService.getWeekdaySchedulesByGraph(body.graphId),
        this.eventService.getEventsByGraphId(body.graphId)
      ]);

      return { schedule, events };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch schedule data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
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
