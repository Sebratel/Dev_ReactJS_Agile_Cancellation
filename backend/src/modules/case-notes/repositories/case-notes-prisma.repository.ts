import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import type { CaseNoteResponse } from '@/modules/case-notes/dto/case-note.response';
import type {
  CaseNotesRepository,
  CreateCaseNoteParams,
} from '@/modules/case-notes/repositories/case-notes.repository';

@Injectable()
export class CaseNotesPrismaRepository implements CaseNotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getCaseAssigneeId(caseId: string): Promise<string | null | undefined> {
    const found = await this.prisma.collectionCase.findUnique({
      where: { id: caseId },
      select: { assignedUserId: true },
    });

    return found ? found.assignedUserId : undefined;
  }

  async listByCase(caseId: string): Promise<CaseNoteResponse[] | null> {
    const caseExists = await this.prisma.collectionCase.findUnique({
      where: { id: caseId },
      select: { id: true },
    });

    if (!caseExists) {
      return null;
    }

    const notes = await this.prisma.caseNote.findMany({
      where: { collectionCaseId: caseId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return notes.map((note) => ({
      id: note.id,
      collectionCaseId: note.collectionCaseId,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      author: note.author
        ? { id: note.author.id, name: note.author.name }
        : null,
    }));
  }

  async create(params: CreateCaseNoteParams): Promise<CaseNoteResponse | null> {
    const caseExists = await this.prisma.collectionCase.findUnique({
      where: { id: params.caseId },
      select: { id: true },
    });

    if (!caseExists) {
      return null;
    }

    const note = await this.prisma.caseNote.create({
      data: {
        collectionCaseId: params.caseId,
        authorId: params.authorId,
        content: params.content,
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return {
      id: note.id,
      collectionCaseId: note.collectionCaseId,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      author: note.author
        ? { id: note.author.id, name: note.author.name }
        : null,
    };
  }
}
