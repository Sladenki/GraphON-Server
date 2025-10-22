import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEnum(['male', 'female'], { message: 'Пол должен быть male или female' })
  gender?: 'male' | 'female';

  @IsOptional()
  @IsDateString({}, { message: 'Дата рождения должна быть в формате ISO 8601' })
  birthDate?: string;
}


