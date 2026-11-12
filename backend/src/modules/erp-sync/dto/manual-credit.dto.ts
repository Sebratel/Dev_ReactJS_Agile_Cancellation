import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ManualCreditDto {
  // Atendente que recebe o crédito da receita.
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  assignedUserId!: string;

  // Motivo obrigatório (fica na Auditoria e na conferência do crédito).
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason!: string;
}
