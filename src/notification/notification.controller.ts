import { Controller, Get, Param } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * GET /notifications
   * Lista todas as notificações (útil para debug e testes)
   */
  @Get()
  getAll() {
    return this.notificationService.getAll();
  }

  /**
   * GET /notifications/:accountId
   * Lista as notificações de uma conta específica
   *
   * Exemplo no Postman:
   *   GET http://localhost:3000/notifications/uuid-da-conta
   */
  @Get(':accountId')
  getByAccount(@Param('accountId') accountId: string) {
    return this.notificationService.getByAccountId(accountId);
  }
}
