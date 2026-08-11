import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ElevenConfig } from '@/config/eleven.config';
import type { RoleCode } from '@/modules/auth/constants/role-codes.constants';
import {
  assertCancellationStepCompletionAllowed,
  type CancellationProcessContext,
  type CancellationStepCompletionSource,
} from '@/modules/cancellations/policies/cancellation-step.policy';

@Injectable()
export class CancellationStepPolicyService {
  constructor(private readonly configService: ConfigService) {}

  assertStepCompletionAllowed(input: {
    context: CancellationProcessContext;
    stepCode: string;
    roles: RoleCode[];
    completionSource: CancellationStepCompletionSource;
  }) {
    const elevenConfig = this.configService.get<ElevenConfig>('eleven');

    assertCancellationStepCompletionAllowed({
      ...input,
      elevenMode: elevenConfig?.mode ?? 'stub',
    });
  }
}
