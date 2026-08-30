import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ContaBancariaService } from './ContaBancaria.service';
import { CreateAccountDto } from './dto/criar-ContaBancaria.dto';

@Controller('contas-bancarias')
export class ContasBancariasController {
  constructor(private readonly contasBancariasService: ContaBancariaService) {}

  @Post()
  async criarConta(@Body() dto: CreateAccountDto) {
    return await this.contasBancariasService.criarConta(dto);
  }

  @Get('usuario/:userId')
  async buscarPorUserId(@Param('userId') userId: string) {
    return await this.contasBancariasService.buscarPorUserId(userId);
  }
}