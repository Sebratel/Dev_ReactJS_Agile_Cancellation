import { IsArray, IsString } from 'class-validator';

export class AutoDistributeDto {
  @IsArray()
  @IsString({ each: true })
  statuses!: string[];

  @IsString()
  targetRole!: string;
}
