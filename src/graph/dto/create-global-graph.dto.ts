import { IsString, IsOptional } from 'class-validator';

export class CreateGlobalGraphDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    city?: string;
    
    @IsString()
    @IsOptional()
    directorName?: string;

    @IsString()
    @IsOptional()
    directorVkLink?: string;

    @IsString()
    @IsOptional()
    vkLink?: string;
} 