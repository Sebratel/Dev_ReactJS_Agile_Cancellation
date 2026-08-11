import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LogoutDto {
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(512)
  refreshToken?: string;
}
