import { ScheduleType } from "../schedule.model";
import { IsString, IsEnum, IsNotEmpty, IsArray, ArrayNotEmpty, ArrayUnique, IsInt, Min, Max, ValidateIf } from 'class-validator';
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

    // Может быть как одним числом, так и массивом чисел
    @Transform(({ value }) => {
        if (Array.isArray(value)) {
            return value.map((v: any) => Number(v));
        }
        return value !== undefined && value !== null ? Number(value) : value;
    })
    @ValidateIf((o) => !Array.isArray(o.dayOfWeek))
    @IsInt()
    @Min(0)
    @Max(6)
    @ValidateIf((o) => Array.isArray(o.dayOfWeek))
    @IsArray()
    @ArrayNotEmpty()
    @ArrayUnique()
    @IsInt({ each: true })
    @Min(0, { each: true })
    @Max(6, { each: true })
    dayOfWeek: number | number[];

    @IsString()
    @IsNotEmpty()
    timeFrom: string;

    @IsString()
    @IsNotEmpty()
    timeTo: string;
}