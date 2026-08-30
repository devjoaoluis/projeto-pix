import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ContaBancariaRepository } from './ContaBancaria.repository';
import { CreateAccountDto } from './dto/criar-ContaBancaria.dto';
import { ContaBancaria } from '../models/ContaBancaria';
import { Usuario } from '../models/Usuario';

@Injectable()
export class ContaBancariaService {
  constructor(
    private readonly contaBancariaRepository: ContaBancariaRepository,
  ) {}

  async criarConta(dto: CreateAccountDto) {
    const contaExistente = await this.contaBancariaRepository.buscarPorUserId(dto.userId);
    
    if (contaExistente) {
      throw new BadRequestException('Este usuário já possui uma conta bancária.');
    }

    const numeroConta = Math.floor(100000 + Math.random() * 900000).toString();
    const agencia = '0001';

    const usuario = Object.create(Usuario.prototype);
    usuario.id = dto.userId;

    const novaConta = new ContaBancaria(
      numeroConta,
      agencia,
      usuario,
    );

    return await this.contaBancariaRepository.salvar(novaConta);
  }

  async buscarPorUserId(userId: string) {
    const conta = await this.contaBancariaRepository.buscarPorUserId(userId);
    
    if (!conta) {
      throw new NotFoundException('Conta bancária não encontrada para este usuário.');
    }

    return conta;
  }
}