import { IsString, IsOptional, MaxLength, IsDateString } from 'class-validator';

export class UpdateEventDto {
    @IsString()
    @IsOptional()
    graphId: string;

    @IsString()
    @IsOptional()
    name: string;

    @IsString()
    @IsOptional()
    @MaxLength(150, { message: 'Описание не может быть длиннее 150 символов' })
    description: string;

    @IsString()
    @IsOptional()
    @MaxLength(150, { message: 'Место проведения не может быть длиннее 150 символов' })
    place: string;

    @IsDateString({}, { message: 'Неверный формат даты события' })
    @IsOptional()
    eventDate: string;

    @IsString()
    @IsOptional()
    timeFrom: string;

    @IsString()
    @IsOptional()
    timeTo: string;

    @IsString()
    @IsOptional()
    globalGraphId: string;
}


