import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { contaBancaria } from '../db/schema';
import { ContaBancaria } from '../models/ContaBancaria';

@Injectable()
export class ContaBancariaRepository {
  constructor(@Inject('PG_CONNECTION') private readonly db: any) {}

  async salvar(conta: ContaBancaria) {
    const [novaConta] = await this.db
      .insert(contaBancaria)
      .values({
        userId: conta.usuario.id,
        numero: conta.numero,
        agencia: conta.agencia,
        saldo: conta.saldo.toString(),
        bloqueada: conta.bloqueada,
        limiteDiario: conta.limiteDiario.toString(),
      })
      .returning();

    return novaConta;
  }

  async buscarPorUserId(userId: string) {
    const [registro] = await this.db
      .select()
      .from(contaBancaria)
      .where(eq(contaBancaria.userId, userId));
    return registro;
  }

  async buscarPorNumero(numeroConta: string) {
    const [registro] = await this.db
      .select()
      .from(contaBancaria)
      .where(eq(contaBancaria.numero, numeroConta));
    return registro;
  }
}