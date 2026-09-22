import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
} from '@nestjs/common';

import { BankAccountService } from './bank-account.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { BlockForFraudDto } from './dto/block-for-fraud.dto';

import { UpdateBalanceDto } from './dto/update-balance.dto';

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

  @Patch(':id/block-fraud')
  blockForFraud(@Param('id') id: string, @Body() dto: BlockForFraudDto) {
    return this.bankAccountService.blockForFraud(id, dto);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.bankAccountService.activate(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
    return this.bankAccountService.update(id, dto);
  }

  @Patch(':id/balance')
  updateBalance(@Param('id') id: string, @Body() dto: UpdateBalanceDto) {
    return this.bankAccountService.updateBalance(id, dto.amount);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bankAccountService.remove(id);
  }
}