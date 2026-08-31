import { Module } from '@nestjs/common';
import { PixService } from './pix.service';
import { PixController } from './pix.controller';
import { PixKeyController } from './pix-key/pix-key.controller';
import { PixKeyService } from './pix-key/pix-key.service';
import { PixTransactionService } from './pix-transaction/pix-transaction.service';
import { PixTransactionController } from './pix-transaction/pix-transaction.controller';

@Module({
  controllers: [PixController, PixKeyController, PixTransactionController],
  providers: [PixService, PixKeyService, PixTransactionService],
})
export class PixModule { }
