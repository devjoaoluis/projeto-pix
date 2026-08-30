import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { BankAccountService } from './bank-account.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';

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
}
