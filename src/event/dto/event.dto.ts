import { IsString, IsNotEmpty, MaxLength, IsOptional, IsDateString, IsBoolean, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEventDto {
    @IsString()
    @IsNotEmpty()
    graphId: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @IsOptional()
    @MaxLength(300, { message: 'Описание не может быть длиннее 300 символов' })
    description?: string;

    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @IsOptional()
    @MaxLength(150, { message: 'Место проведения не может быть длиннее 150 символов' })
    place?: string;

    @Transform(({ value }) => value === '' ? undefined : value)
    @IsOptional()
    @IsDateString({}, { message: 'Неверный формат даты события' })
    eventDate?: string;

    @IsOptional()
    @IsBoolean()
    isDateTbd?: boolean;

    @Transform(({ value }) => value === '' ? undefined : value)
    @ValidateIf(o => !o.isDateTbd)
    @IsString()
    @IsNotEmpty()
    timeFrom?: string;

    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @IsOptional()
    timeTo?: string;

    @IsString()
    @IsNotEmpty()
    globalGraphId: string;
}
