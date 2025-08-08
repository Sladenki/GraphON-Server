import { Types } from "mongoose"
import { IsString, IsOptional } from 'class-validator';

export class CreateGraphDto {
   name: string
   parentGraphId: Types.ObjectId
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