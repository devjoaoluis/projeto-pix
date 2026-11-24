import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../modules/usuarios/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtTokenService } from './jwt-token.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AccountAccessGuard } from './guards/account-access.guard';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';

@Global()
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtTokenService,
    JwtAuthGuard,
    AccountAccessGuard,
    WebhookSignatureGuard,
    {
      provide: APP_GUARD,
      useExisting: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: AccountAccessGuard,
    },
  ],
  exports: [
    AuthService,
    JwtTokenService,
    JwtAuthGuard,
    AccountAccessGuard,
    WebhookSignatureGuard,
  ],
})
export class AuthModule {}
