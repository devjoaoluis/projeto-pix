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
import { RefundPixDto } from './dto/refund-pix.dto';

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

  @Post(':id/refund')
  refundPost(@Param('id') id: string, @Body() dto?: RefundPixDto) {
    return this.pixTransactionService.refund(id, dto);
  }

  @Patch(':id/refund')
  refund(@Param('id') id: string, @Body() dto?: RefundPixDto) {
    return this.pixTransactionService.refund(id, dto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.pixTransactionService.cancel(id);
  }
}
