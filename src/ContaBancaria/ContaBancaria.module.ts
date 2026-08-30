import { Module } from '@nestjs/common';
import { ContasBancariasController } from './ContaBancaria.controller';
import { ContaBancariaService } from './ContaBancaria.service';
import { ContaBancariaRepository } from './ContaBancaria.repository';

@Module({
  controllers: [ContasBancariasController],
  providers: [ContaBancariaService, ContaBancariaRepository],
  exports: [ContaBancariaService, ContaBancariaRepository],
})
export class ContasBancariasModule {}