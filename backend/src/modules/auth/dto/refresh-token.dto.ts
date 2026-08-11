import { IsString, MaxLength, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @MinLength(10)
  @MaxLength(512)
  refreshToken!: string;
}
