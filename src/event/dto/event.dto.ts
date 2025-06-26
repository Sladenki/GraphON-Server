import { IsString, IsNotEmpty, MaxLength, IsOptional, IsDateString } from 'class-validator';

export class CreateEventDto {
    @IsString()
    @IsNotEmpty()
    graphId: string;

    @IsString()
    @IsNotEmpty()
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
    eventDate: string;

    @IsString()
    @IsNotEmpty()
    timeFrom: string;

    @IsString()
    @IsOptional()
    timeTo: string;

    @IsString()
    @IsNotEmpty()
    globalGraphId: string;
}
