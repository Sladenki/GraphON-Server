import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateGlobalGraphDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    city?: string;
    
    @IsString()
    @IsOptional()
    @MaxLength(200, { message: 'Описание не может быть длиннее 200 символов' })
    about?: string;
    
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