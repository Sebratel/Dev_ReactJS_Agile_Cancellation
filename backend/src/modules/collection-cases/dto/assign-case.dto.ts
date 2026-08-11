import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AssignCaseDto {
  /**
   * Id do usuario responsavel. Envie `null` (ou omita) para remover a atribuicao.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  assignedUserId?: string | null;
}
