import { Body, Controller, Param, Post } from '@nestjs/common';
import { PixTransactionService } from './pix-transaction.service';
import { TransferPixDto } from './dto/transfer-pix.dto';
import { ReceivePixDto } from './dto/receive-pix.dto';

@Controller('pix/transactions')
export class PixTransactionController {

    constructor(private readonly pixTransactionService: PixTransactionService) {}

    // POST /bank-accounts/:id/pix/transfer
    @Post('transfer')
    transfer(@Param('id') accountId: string, @Body() dto: TransferPixDto) {
        return this.pixTransactionService.transfer(accountId, dto);
    }

    // POST /pix/webhook (chamado pelo provedor externo)
    @Post('webhook')
    receiveWebhook(@Body() dto: ReceivePixDto) {
        return this.pixTransactionService.receiveWebhook(dto);
    }

}
