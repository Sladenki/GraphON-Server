import { Types } from "mongoose"
import { IsString, IsOptional, IsMongoId, MaxLength } from 'class-validator';

export class CreateGraphDto {
   @IsString()
   name: string
   
   @IsMongoId()
   parentGraphId: Types.ObjectId
   
   @IsMongoId()
   globalGraphId: Types.ObjectId
   
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