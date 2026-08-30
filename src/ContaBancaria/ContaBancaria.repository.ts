import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { contaBancaria } from '../db/schema';
import { ContaBancaria } from '../models/ContaBancaria';
import { DRIZZLE } from '../db/db.provider';

@Injectable()
export class ContaBancariaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async salvar(conta: any) {
  // Garante valores válidos para todos os campos obrigatorios
  const userId = conta?.userId || conta?.usuario?.id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const numero = conta?.numero || Math.floor(100000 + Math.random() * 900000).toString();
  const agencia = conta?.agencia || '0001';

  const [novaConta] = await this.db
    .insert(contaBancaria)
    .values({
      userId,
      numero,
      agencia,
      saldo: '0.00',
      bloqueada: false,
      limiteDiario: '10000.00',
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