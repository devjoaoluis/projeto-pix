import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/auth.decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountAccessGuard } from '../auth/guards/account-access.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { NotificationService } from './notification.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard, AccountAccessGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Roles('ADMIN')
  @Get()
  getAll(@Query() pagination?: PaginationQueryDto) {
    return this.notificationService.getAll(pagination);
  }

  @Get(':accountId/preferences')
  getPreferences(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.notificationService.getPreferences(accountId);
  }

  @Patch(':accountId/preferences')
  updatePreferences(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationService.updatePreferences(accountId, dto);
  }

  @Post(':accountId/enable-sms')
  enableSms(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body('phone') phone?: string,
  ) {
    return this.notificationService.enableChannel(accountId, 'SMS', phone);
  }

  @Post(':accountId/enable-email')
  enableEmail(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body('email') email?: string,
  ) {
    return this.notificationService.enableChannel(accountId, 'EMAIL', email);
  }

  @Get(':accountId')
  getByAccount(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.notificationService.getByAccountId(accountId, pagination);
  }
}
