import { Body, Controller, Param, Post } from '@nestjs/common';
import { PixTransactionService } from './pix-transaction.service';
import { TransferPixDto } from './dto/transfer-pix.dto';
import { ReceivePixDto } from './dto/receive-pix.dto';

@Controller('pix/transactions')
export class PixTransactionController {

    constructor(private readonly pixTransactionService: PixTransactionService) {}

    @Post(':senderAccountId/transfer')
    transfer(@Param('senderAccountId') senderAccountId: string, @Body() dto: TransferPixDto) {
        return this.pixTransactionService.transfer(senderAccountId, dto);
    }

    @Post('webhook')
    receiveWebhook(@Body() dto: ReceivePixDto) {
        return this.pixTransactionService.receiveWebhook(dto);
    }

}
