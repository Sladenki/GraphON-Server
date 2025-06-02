import { IsString, IsOptional, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class CreateTopicGraphDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    about?: string;

    @IsMongoId()
    parentGraphId: Types.ObjectId;

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

    @IsString()
    @IsOptional()
    websiteLink?: string;
} 