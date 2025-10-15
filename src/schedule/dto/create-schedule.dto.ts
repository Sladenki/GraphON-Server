import { ScheduleType } from "../schedule.model";
import { IsString, IsNumber, IsEnum, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateScheduleDto {
    @IsString()
    @IsNotEmpty()
    graphId: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEnum(ScheduleType)
    type: ScheduleType;

    @Transform(({ value }) => value !== undefined && value !== null ? String(value) : value)
    @IsString()
    @IsNotEmpty()
    roomNumber: string;

    @IsNumber()
    dayOfWeek: number;

    @IsString()
    @IsNotEmpty()
    timeFrom: string;

    @IsString()
    @IsNotEmpty()
    timeTo: string;
}