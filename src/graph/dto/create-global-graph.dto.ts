import { IsString, IsOptional } from 'class-validator';

export class CreateGlobalGraphDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    city?: string;
} 