import { Body, Controller, Param, Post, Get, Query, Patch } from '@nestjs/common';
import { PixTransactionService } from './pix-transaction.service';
import { TransferPixDto } from './dto/transfer-pix.dto';
import { ReceivePixDto } from './dto/receive-pix.dto';
import { FilterPixTransactionsDto } from './dto/filter-pix-transactions.dto';

@Controller('pix/transactions')
export class PixTransactionController {

    constructor(private readonly pixTransactionService: PixTransactionService) {}

    @Get()
    findAll() {
        return this.pixTransactionService.findAll();
    }

    @Post(':senderAccountId/transfer')
    transfer(@Param('senderAccountId') senderAccountId: string, @Body() dto: TransferPixDto) {
        return this.pixTransactionService.transfer(senderAccountId, dto);
    }

    @Get('account/:bankAccountId')
    getTransactions(
      @Param('bankAccountId') bankAccountId: string,
      @Query() filterDto: FilterPixTransactionsDto,
    ) {
        return this.pixTransactionService.getTransactionsByAccountAndDate(bankAccountId, filterDto);
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
