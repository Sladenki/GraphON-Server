import { IsString, IsNotEmpty } from 'class-validator';

export class ToggleGraphSubDto {
  @IsString()
  @IsNotEmpty()
  graphId: string;
}
