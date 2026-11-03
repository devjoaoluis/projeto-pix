import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { PixKeyService } from './pix-key.service';
import { CreatePixKeyDto } from './dto/create-pix-key.dto';
import { UpdatePixKeyDto } from './dto/update-pix-key.dto';

@Controller(['pix/keys/account', 'pix/keys'])
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

  @Patch(':bankAccountId/:id')
  update(
    @Param('bankAccountId') bankAccountId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePixKeyDto,
  ) {
    return this.pixKeyService.update(bankAccountId, id, dto);
  }

  @Put(':bankAccountId/:id')
  updatePut(
    @Param('bankAccountId') bankAccountId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePixKeyDto,
  ) {
    return this.pixKeyService.update(bankAccountId, id, dto);
  }

  @Patch(':bankAccountId/:id/random')
  updateRandomKey(
    @Param('bankAccountId') bankAccountId: string,
    @Param('id') id: string,
  ) {
    return this.pixKeyService.updateRandomKey(bankAccountId, id);
  }

  @Patch(':id')
  updateById(@Param('id') id: string, @Body() dto: UpdatePixKeyDto) {
    return this.pixKeyService.updateWithoutAccount(id, dto);
  }

  @Put(':id')
  updateByIdPut(@Param('id') id: string, @Body() dto: UpdatePixKeyDto) {
    return this.pixKeyService.updateWithoutAccount(id, dto);
  }

  @Delete(':bankAccountId/:id')
  remove(
    @Param('bankAccountId') bankAccountId: string,
    @Param('id') id: string,
  ) {
    return this.pixKeyService.remove(bankAccountId, id);
  }
}
