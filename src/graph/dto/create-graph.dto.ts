import { Types } from "mongoose"
import { IsString, IsOptional, IsMongoId } from 'class-validator';

export class CreateGraphDto {
   @IsString()
   name: string
   
   @IsMongoId()
   parentGraphId: Types.ObjectId
   
   @IsMongoId()
   globalGraphId: Types.ObjectId
   
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