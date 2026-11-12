import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getJwtConfig } from '@/config/jwt.config';
import { AuditModule } from '@/modules/audit/audit.module';
import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService } from '@/modules/auth/auth.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { AuthMockRepository } from '@/modules/auth/repositories/auth-mock.repository';
import { AuthPrismaRepository } from '@/modules/auth/repositories/auth-prisma.repository';
import { authRepositoryProvider } from '@/modules/auth/repositories/auth.repository.provider';
import { googleTokenVerifierProvider } from '@/modules/auth/repositories/google-token-verifier.provider';
import { GoogleTokenVerifierMockService } from '@/modules/auth/services/google-token-verifier.mock.service';
import { GoogleTokenVerifierService } from '@/modules/auth/services/google-token-verifier.service';
import { JwtStrategy } from '@/modules/auth/strategies/jwt.strategy';

@Module({
  imports: [
    AuditModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        const jwtConfig = getJwtConfig();

        return {
          secret: jwtConfig.secret,
          signOptions: {
            expiresIn:
              jwtConfig.accessExpiresIn as `${number}${'m' | 'h' | 'd'}`,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthMockRepository,
    AuthPrismaRepository,
    authRepositoryProvider,
    GoogleTokenVerifierMockService,
    GoogleTokenVerifierService,
    googleTokenVerifierProvider,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
