import { ScheduleType } from "../schedule.model";
import { IsString, IsNumber, IsEnum, IsNotEmpty } from 'class-validator';

export class CreateScheduleDto {
    @IsString()
    @IsNotEmpty()
    graphId: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEnum(ScheduleType)
    type: ScheduleType;

    @IsNumber()
    roomNumber: number;

    @IsNumber()
    dayOfWeek: number;

    @IsString()
    @IsNotEmpty()
    timeFrom: string;

    @IsString()
    @IsNotEmpty()
    timeTo: string;
}