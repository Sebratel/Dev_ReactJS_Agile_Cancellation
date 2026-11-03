import {
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class MatrixReplyDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  caseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  codAtendimento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  cod_atendimento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  codMensagem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  cod_mensagem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  author?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsISO8601()
  receivedAt?: string;

  @IsOptional()
  @IsObject()
  raw?: Record<string, unknown>;
}
