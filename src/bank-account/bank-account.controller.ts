import { Body, Controller, Get, Param, Patch, Post, Delete } from '@nestjs/common';

import { BankAccountService } from './bank-account.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';

import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

@Controller('bank-accounts')
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Post()
  create(@Body() dto: CreateBankAccountDto) {
    return this.bankAccountService.create(dto);
  }

  @Get()
  findAll() {
    return this.bankAccountService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.bankAccountService.findById(id);
  }

  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.bankAccountService.findByUserId(userId);
  }

  @Get(':id/balance')
  getBalance(@Param('id') id: string) {
    return this.bankAccountService.getBalance(id);
  }

  @Patch(':id/block')
  block(@Param('id') id: string) {
    return this.bankAccountService.block(id);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.bankAccountService.activate(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
    return this.bankAccountService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bankAccountService.remove(id);
  }
}
