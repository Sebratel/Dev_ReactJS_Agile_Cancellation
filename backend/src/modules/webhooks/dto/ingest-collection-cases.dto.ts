import {
  ContractStatus,
  InvoiceStatus,
  CollectionStatus,
  Priority,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class IngestCustomerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  document!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalId?: string;
}

export class IngestContractDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  code!: string;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @IsISO8601()
  startDate!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalId?: string;
}

export class IngestInvoiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  externalId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  invoiceNumber?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsISO8601()
  dueDate!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;
}

export class IngestCaseDto {
  @IsOptional()
  @IsEnum(CollectionStatus)
  status?: CollectionStatus;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsNumber()
  @Min(0)
  outstandingAmount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  daysOverdue?: number;
}

export class IngestCollectionEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  externalId!: string;

  @ValidateNested()
  @Type(() => IngestCustomerDto)
  customer!: IngestCustomerDto;

  @ValidateNested()
  @Type(() => IngestContractDto)
  contract!: IngestContractDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngestInvoiceDto)
  invoices?: IngestInvoiceDto[];

  @ValidateNested()
  @Type(() => IngestCaseDto)
  case!: IngestCaseDto;
}

export class IngestCollectionCasesDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  source?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => IngestCollectionEventDto)
  events!: IngestCollectionEventDto[];
}
