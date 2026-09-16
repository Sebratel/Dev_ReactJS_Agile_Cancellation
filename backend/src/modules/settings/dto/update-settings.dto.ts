import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  allowAgentSendToCancellation?: boolean;
}
