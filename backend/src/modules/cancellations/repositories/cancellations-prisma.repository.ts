import {
  AuditAction,
  CancellationStatus,
  CancellationStepStatus,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import type { CancellationStepResponse } from '@/modules/cancellations/dto/cancellation-step.response';
import type {
  CancellationProcessContextResult,
  CancellationsRepository,
  CompleteCancellationStepParams,
  CompleteCancellationStepResult,
  ElevenRequestEligibilityResult,
} from '@/modules/cancellations/repositories/cancellations.repository';
import { COLLECTION_CASE_STATUS_AFTER_CANCELLATION_COMPLETED } from '@/modules/cancellations/constants/collection-case-closure.constants';
import {
  areAllCancellationStepsCompleted,
  mapCancellationStepToResponse,
} from '@/modules/cancellations/utils/cancellation-step.utils';

@Injectable()
export class CancellationsPrismaRepository implements CancellationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getProcessContext(
    cancellationId: string,
  ): Promise<CancellationProcessContextResult> {
    const process = await this.prisma.cancellationProcess.findUnique({
      where: { id: cancellationId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!process) {
      return { outcome: 'process_not_found' };
    }

    return {
      outcome: 'found',
      context: {
        cancellationId: process.id,
        processStatus: process.status,
        steps: process.steps.map((step) => ({
          stepCode: step.name,
          stepOrder: step.stepOrder,
          status: step.status,
        })),
      },
    };
  }

  async validateElevenRequestEligibility(
    cancellationId: string,
  ): Promise<ElevenRequestEligibilityResult> {
    const process = await this.prisma.cancellationProcess.findUnique({
      where: { id: cancellationId },
      include: {
        steps: true,
      },
    });

    if (!process) {
      return { outcome: 'process_not_found' };
    }

    if (process.status === CancellationStatus.COMPLETED) {
      return { outcome: 'process_already_completed' };
    }

    const step = process.steps.find(
      (item) => item.name === 'OPEN_ELEVEN_REQUEST',
    );

    if (!step) {
      return { outcome: 'step_not_found' };
    }

    if (step.status === CancellationStepStatus.COMPLETED) {
      return { outcome: 'step_already_completed' };
    }

    return { outcome: 'eligible' };
  }

  async completeStep({
    cancellationId,
    stepCode,
    input,
    performedByUserId,
    performedByName,
    integrationMetadata,
  }: CompleteCancellationStepParams): Promise<CompleteCancellationStepResult> {
    const process = await this.prisma.cancellationProcess.findUnique({
      where: { id: cancellationId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!process) {
      return { outcome: 'process_not_found' };
    }

    const step = process.steps.find((item) => item.name === stepCode);

    if (!step) {
      return { outcome: 'step_not_found' };
    }

    if (step.status === CancellationStepStatus.COMPLETED) {
      return { outcome: 'step_already_completed' };
    }

    const completedAt = input.completedAt
      ? new Date(input.completedAt)
      : new Date();
    const now = new Date();
    const stepMetadata = {
      notes: input.notes ?? null,
      completedByUserId: performedByUserId,
      completedByName: performedByName,
    };

    const beforeStepSnapshot = {
      id: step.id,
      stepCode: step.name,
      status: step.status,
      completedAt: step.completedAt?.toISOString() ?? null,
      externalProtocol: step.externalId,
    };

    const updatedStep = await this.prisma.$transaction(async (tx) => {
      const savedStep = await tx.cancellationStep.update({
        where: { id: step.id },
        data: {
          status: CancellationStepStatus.COMPLETED,
          completedAt,
          externalId: input.externalProtocol ?? null,
          metadata: stepMetadata,
          updatedAt: now,
        },
      });

      const nextProcessStatus =
        process.status === CancellationStatus.PENDING
          ? CancellationStatus.IN_PROGRESS
          : process.status;

      await tx.cancellationProcess.update({
        where: { id: cancellationId },
        data: {
          status: nextProcessStatus,
          updatedAt: now,
        },
      });

      if (process.collectionCaseId) {
        await tx.auditLog.create({
          data: {
            entityType: 'COLLECTION_CASE',
            entityId: process.collectionCaseId,
            action: AuditAction.STATUS_CHANGE,
            performedByUserId,
            beforeSnapshot: beforeStepSnapshot,
            afterSnapshot: {
              id: savedStep.id,
              stepCode: savedStep.name,
              status: savedStep.status,
              completedAt: savedStep.completedAt?.toISOString() ?? null,
              externalProtocol: savedStep.externalId,
            },
            metadata: {
              cancellationProcessId: cancellationId,
              stepId: savedStep.id,
              stepCode: savedStep.name,
              resourceType: 'CANCELLATION_STEP',
              action: 'COMPLETED',
              notes: input.notes ?? null,
              ...integrationMetadata,
            },
          },
        });
      }

      const allCompleted = areAllCancellationStepsCompleted(
        process.steps.map((item) =>
          item.id === savedStep.id
            ? { status: CancellationStepStatus.COMPLETED }
            : item,
        ),
      );

      if (allCompleted) {
        await tx.cancellationProcess.update({
          where: { id: cancellationId },
          data: {
            status: CancellationStatus.COMPLETED,
            completedAt: now,
            updatedAt: now,
          },
        });

        if (process.collectionCaseId) {
          const existingCase = await tx.collectionCase.findUnique({
            where: { id: process.collectionCaseId },
          });

          if (existingCase) {
            await tx.collectionCase.update({
              where: { id: process.collectionCaseId },
              data: {
                status: COLLECTION_CASE_STATUS_AFTER_CANCELLATION_COMPLETED,
                updatedAt: now,
              },
            });

            await tx.auditLog.create({
              data: {
                entityType: 'COLLECTION_CASE',
                entityId: process.collectionCaseId,
                action: AuditAction.STATUS_CHANGE,
                performedByUserId,
                beforeSnapshot: {
                  status: existingCase.status,
                  cancellationProcess: {
                    id: cancellationId,
                    status: nextProcessStatus,
                  },
                },
                afterSnapshot: {
                  status: COLLECTION_CASE_STATUS_AFTER_CANCELLATION_COMPLETED,
                  cancellationProcess: {
                    id: cancellationId,
                    status: CancellationStatus.COMPLETED,
                    completedAt: now.toISOString(),
                  },
                },
                metadata: {
                  cancellationProcessId: cancellationId,
                  resourceType: 'CANCELLATION_PROCESS',
                  action: 'COMPLETED',
                },
              },
            });
          }
        }
      }

      return savedStep;
    });

    const allCompleted = areAllCancellationStepsCompleted(
      process.steps.map((item) =>
        item.id === updatedStep.id
          ? { status: CancellationStepStatus.COMPLETED }
          : item,
      ),
    );

    const response: CancellationStepResponse = mapCancellationStepToResponse(
      updatedStep,
      cancellationId,
    );

    return {
      outcome: 'success',
      step: response,
      processCompleted: allCompleted,
    };
  }
}
