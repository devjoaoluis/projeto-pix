import { describe, it, expect } from 'vitest';
import {
  amountSchema,
  amountNumber,
  validCpf,
  userSchema,
  transferSchema,
} from './validation';
describe('entrada de valores financeiros', () => {
  it('rejeita valores maiores que a precisão suportada pelas transações', () => {
    expect(amountSchema.safeParse('10000000000').success).toBe(false);
    expect(amountSchema.safeParse('9999999999,99').success).toBe(true);
  });
  it('converte reais com vírgula ou ponto', () => {
    expect(amountNumber('10,25')).toBe(10.25);
    expect(amountNumber('10.25')).toBe(10.25);
  });
  it('rejeita valores vazios, negativos, não finitos ou com precisão excessiva', () => {
    for (const value of ['', '0', '-1', 'Infinity', '1e3', '1,234', 'NaN'])
      expect(amountSchema.safeParse(value).success).toBe(false);
  });
  it('aceita valores positivos com até duas casas', () => {
    for (const value of ['0,01', '120', '15.50'])
      expect(amountSchema.safeParse(value).success).toBe(true);
  });
});
describe('campos enviados para a API', () => {
  it('rejeita telefone que fica vazio após remover a máscara', () => {
    expect(
      userSchema.safeParse({
        name: 'Teste',
        cpf: '52998224725',
        email: 'teste@example.com',
        phone: '(  ) -',
      }).success,
    ).toBe(false);
  });
  it('rejeita descrição longa e agendamento inválido antes do envio', () => {
    const valid = {
      account: 'conta',
      pixKey: 'destino@example.com',
      amount: '10',
      description: '',
      scheduledAt: '',
    };
    expect(
      transferSchema.safeParse({ ...valid, description: 'x'.repeat(256) })
        .success,
    ).toBe(false);
    expect(
      transferSchema.safeParse({ ...valid, scheduledAt: 'inválido' }).success,
    ).toBe(false);
    expect(
      transferSchema.safeParse({ ...valid, scheduledAt: '2020-01-01T12:00' })
        .success,
    ).toBe(false);
  });
});
describe('validação de CPF', () => {
  it('confere dígitos verificadores e aceita máscara', () => {
    expect(validCpf('529.982.247-25')).toBe(true);
    expect(validCpf('52998224725')).toBe(true);
  });
  it('rejeita sequências repetidas e dígitos incorretos', () => {
    expect(validCpf('11111111111')).toBe(false);
    expect(validCpf('52998224726')).toBe(false);
  });
});
