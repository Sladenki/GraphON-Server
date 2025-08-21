import { IsString, IsOptional, MaxLength, IsDateString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateEventDto {
    @IsString()
    @IsOptional()
    graphId: string;

    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @IsOptional()
    name?: string;

    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @IsOptional()
    @MaxLength(150, { message: 'Описание не может быть длиннее 150 символов' })
    description?: string;

    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @IsOptional()
    @MaxLength(150, { message: 'Место проведения не может быть длиннее 150 символов' })
    place?: string;

    @Transform(({ value }) => value === '' ? undefined : value)
    @IsDateString({}, { message: 'Неверный формат даты события' })
    @IsOptional()
    eventDate?: string;

    @IsBoolean()
    @IsOptional()
    isDateTbd?: boolean;

    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @IsOptional()
    timeFrom?: string;

    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @IsOptional()
    timeTo?: string;

    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @IsOptional()
    globalGraphId?: string;
}


