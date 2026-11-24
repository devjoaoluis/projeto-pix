import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/auth.decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountAccessGuard } from '../auth/guards/account-access.guard';
import { NotificationService } from './notification.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard, AccountAccessGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * GET /notifications
   * Lista todas as notificações (exclusivo ADMIN)
   */
  @Roles('ADMIN')
  @Get()
  getAll() {
    return this.notificationService.getAll();
  }

  /**
   * GET /notifications/:accountId/preferences
   * Consulta as preferências de notificação (SMS / Email) de uma conta
   */
  @Get(':accountId/preferences')
  getPreferences(@Param('accountId') accountId: string) {
    return this.notificationService.getPreferences(accountId);
  }

  /**
   * PATCH /notifications/:accountId/preferences
   * Habilita ou desabilita notificações por SMS e/ou Email
   */
  @Patch(':accountId/preferences')
  updatePreferences(
    @Param('accountId') accountId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationService.updatePreferences(accountId, dto);
  }

  /**
   * POST /notifications/:accountId/enable-sms
   * Atalho para habilitar notificações via SMS
   */
  @Post(':accountId/enable-sms')
  enableSms(
    @Param('accountId') accountId: string,
    @Body('phone') phone?: string,
  ) {
    return this.notificationService.enableChannel(accountId, 'SMS', phone);
  }

  /**
   * POST /notifications/:accountId/enable-email
   * Atalho para habilitar notificações via Email
   */
  @Post(':accountId/enable-email')
  enableEmail(
    @Param('accountId') accountId: string,
    @Body('email') email?: string,
  ) {
    return this.notificationService.enableChannel(accountId, 'EMAIL', email);
  }

  /**
   * GET /notifications/:accountId
   * Lista as notificações de uma conta específica
   */
  @Get(':accountId')
  getByAccount(@Param('accountId') accountId: string) {
    return this.notificationService.getByAccountId(accountId);
  }
}
