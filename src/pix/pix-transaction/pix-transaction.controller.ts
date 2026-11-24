import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Get,
  Query,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Public, Roles } from '../../auth/decorators/auth.decorators';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AccountAccessGuard } from '../../auth/guards/account-access.guard';
import { WebhookSignatureGuard } from '../../auth/guards/webhook-signature.guard';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PixTransactionService } from './pix-transaction.service';
import { TransferPixDto } from './dto/transfer-pix.dto';
import { SchedulePixDto } from './dto/schedule-pix.dto';
import { ReceivePixDto } from './dto/receive-pix.dto';
import { FilterPixTransactionsDto } from './dto/filter-pix-transactions.dto';

@Controller('pix/transactions')
@UseGuards(JwtAuthGuard, AccountAccessGuard)
export class PixTransactionController {
  constructor(private readonly pixTransactionService: PixTransactionService) {}

  @Roles('ADMIN')
  @Get()
  findAll(@Query() pagination?: PaginationQueryDto) {
    return this.pixTransactionService.findAll(pagination);
  }

  @Post(':senderAccountId/transfer')
  transfer(
    @Param('senderAccountId', ParseUUIDPipe) senderAccountId: string,
    @Body() dto: TransferPixDto,
  ) {
    return this.pixTransactionService.transfer(senderAccountId, dto);
  }

  @Get('account/:bankAccountId')
  getTransactions(
    @Param('bankAccountId', ParseUUIDPipe) bankAccountId: string,
    @Query() filterDto: FilterPixTransactionsDto,
  ) {
    return this.pixTransactionService.getTransactionsByAccountAndDate(
      bankAccountId,
      filterDto,
    );
  }

  @Get('account/:bankAccountId/history')
  getHistory(
    @Param('bankAccountId', ParseUUIDPipe) bankAccountId: string,
    @Query() filterDto: FilterPixTransactionsDto,
  ) {
    return this.pixTransactionService.getHistory(bankAccountId, filterDto);
  }

  @Public()
  @UseGuards(WebhookSignatureGuard)
  @Post('webhook')
  receiveWebhook(@Body() dto: ReceivePixDto) {
    return this.pixTransactionService.receiveWebhook(dto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.pixTransactionService.cancel(id);
  }

  @Post(':senderAccountId/schedule')
  schedule(
    @Param('senderAccountId', ParseUUIDPipe) senderAccountId: string,
    @Body() dto: SchedulePixDto,
  ) {
    return this.pixTransactionService.schedule(senderAccountId, dto);
  }

  @Get('account/:bankAccountId/scheduled')
  getScheduled(@Param('bankAccountId', ParseUUIDPipe) bankAccountId: string) {
    return this.pixTransactionService.getScheduled(bankAccountId);
  }
}
