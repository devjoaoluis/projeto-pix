import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { PixKeyService } from './pix-key.service';
import { CreatePixKeyDto } from './dto/create-pix-key.dto';

@Controller('pix/keys/account')
export class PixKeyController {
  constructor(private readonly pixKeyService: PixKeyService) {}

  @Post(':bankAccountId')
  create(
    @Param('bankAccountId') bankAccountId: string,
    @Body() dto: CreatePixKeyDto,
  ) {
    return this.pixKeyService.create(bankAccountId, dto);
  }

  @Get(':bankAccountId')
  findByAccount(@Param('bankAccountId') bankAccountId: string) {
    return this.pixKeyService.findByAccount(bankAccountId);
  }

  @Post(':bankAccountId/random')
  generateRandomKey(@Param('bankAccountId') bankAccountId: string) {
    return this.pixKeyService.generateRandomKey(bankAccountId);
  }

  @Delete(':bankAccountId/:id')
  remove(
    @Param('bankAccountId') bankAccountId: string,
    @Param('id') id: string,
  ) {
    return this.pixKeyService.remove(bankAccountId, id);
  }
}
