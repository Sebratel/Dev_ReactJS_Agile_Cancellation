import { Module } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { UsersController } from '@/modules/users/users.controller';
import { UsersService } from '@/modules/users/users.service';
import { UsersMockRepository } from '@/modules/users/repositories/users-mock.repository';
import { UsersPrismaRepository } from '@/modules/users/repositories/users-prisma.repository';
import { usersRepositoryProvider } from '@/modules/users/repositories/users.repository.provider';

@Module({
  imports: [AuditModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersMockRepository,
    UsersPrismaRepository,
    usersRepositoryProvider,
  ],
})
export class UsersModule {}
