import { ScheduleType } from "../schedule.model";
import { IsString, IsEnum, IsNotEmpty, IsOptional, IsArray, ArrayNotEmpty, ArrayUnique, IsInt, Min, Max } from 'class-validator';
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

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(6)
    dayOfWeek?: number;

    @IsOptional()
    @Transform(({ value }) => Array.isArray(value) ? value.map((v: any) => Number(v)) : value)
    @IsArray()
    @ArrayNotEmpty()
    @ArrayUnique()
    @IsInt({ each: true })
    @Min(0, { each: true })
    @Max(6, { each: true })
    daysOfWeek?: number[];

    @IsString()
    @IsNotEmpty()
    timeFrom: string;

    @IsString()
    @IsNotEmpty()
    timeTo: string;
}