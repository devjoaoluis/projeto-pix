import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  Query,
  Patch,
} from '@nestjs/common';
import { PixTransactionService } from './pix-transaction.service';
import { TransferPixDto } from './dto/transfer-pix.dto';
import { ReceivePixDto } from './dto/receive-pix.dto';
import { FilterPixTransactionsDto } from './dto/filter-pix-transactions.dto';
import { SchedulePixDto } from './dto/schedule-pix.dto';

@Controller('pix/transactions')
export class PixTransactionController {
  constructor(private readonly pixTransactionService: PixTransactionService) {}

  @Get()
  findAll() {
    return this.pixTransactionService.findAll();
  }

  @Post(':senderAccountId/transfer')
  transfer(
    @Param('senderAccountId') senderAccountId: string,
    @Body() dto: TransferPixDto,
  ) {
    return this.pixTransactionService.transfer(senderAccountId, dto);
  }

  @Post(':senderAccountId/schedule')
  scheduleTransfer(
    @Param('senderAccountId') senderAccountId: string,
    @Body() dto: SchedulePixDto,
  ) {
    return this.pixTransactionService.scheduleTransfer(senderAccountId, dto);
  }

  @Get('account/:bankAccountId/scheduled')
  getScheduledByAccount(@Param('bankAccountId') bankAccountId: string) {
    return this.pixTransactionService.getScheduledByAccount(bankAccountId);
  }

  @Patch(':id/execute-scheduled')
  executeScheduled(@Param('id') id: string) {
    return this.pixTransactionService.executeScheduled(id);
  }

  @Post(':id/execute-scheduled')
  executeScheduledPost(@Param('id') id: string) {
    return this.pixTransactionService.executeScheduled(id);
  }

  @Get('account/:bankAccountId')
  getTransactions(
    @Param('bankAccountId') bankAccountId: string,
    @Query() filterDto: FilterPixTransactionsDto,
  ) {
    return this.pixTransactionService.getTransactionsByAccountAndDate(
      bankAccountId,
      filterDto,
    );
  }

  @Get('account/:bankAccountId/history')
  getHistory(
    @Param('bankAccountId') bankAccountId: string,
    @Query() filterDto: FilterPixTransactionsDto,
  ) {
    return this.pixTransactionService.getHistory(bankAccountId, filterDto);
  }

  @Post('webhook')
  receiveWebhook(@Body() dto: ReceivePixDto) {
    return this.pixTransactionService.receiveWebhook(dto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.pixTransactionService.cancel(id);
  }
}
