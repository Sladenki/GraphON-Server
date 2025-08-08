import { IsString, IsOptional, IsMongoId, MaxLength } from 'class-validator';
import { Types } from 'mongoose';

export class CreateTopicGraphDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    @MaxLength(200, { message: 'Описание не может быть длиннее 200 символов' })
    about?: string;

    @IsMongoId()
    parentGraphId: Types.ObjectId;

    @IsString()
    @IsOptional()
    directorName?: string;

    @IsString()
    @IsOptional()
    directorVkLink?: string;

    @IsString()
    @IsOptional()
    vkLink?: string;

    @IsString()
    @IsOptional()
    websiteLink?: string;
} 