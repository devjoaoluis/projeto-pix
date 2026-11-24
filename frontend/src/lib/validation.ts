import { z } from 'zod';
import { digits } from './utils';
export function validCpf(value: string) {
  const cpf = digits(value);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  return [9, 10].every((length) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const remainder = (sum * 10) % 11;
    return (remainder === 10 ? 0 : remainder) === Number(cpf[length]);
  });
}
export const userSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome.')
    .max(255, 'Use até 255 caracteres.'),
  cpf: z.string().refine(validCpf, 'Informe um CPF válido.'),
  email: z
    .email('Informe um e-mail válido.')
    .max(255, 'Use até 255 caracteres.'),
  phone: z
    .string()
    .refine(
      (value) => /^\d{10,11}$/.test(digits(value)),
      'Informe o telefone com DDD (10 ou 11 dígitos).',
    ),
});
export const amountSchema = z
  .string()
  .refine(
    (v) =>
      /^\d+([.,]\d{1,2})?$/.test(v) &&
      Number(v.replace(',', '.')) > 0 &&
      Number(v.replace(',', '.')) <= 9999999999.99 &&
      Number.isFinite(Number(v.replace(',', '.'))),
    'Informe um valor entre R$ 0,01 e R$ 9.999.999.999,99 com até duas casas decimais.',
  );
export const amountNumber = (value: string) => Number(value.replace(',', '.'));
export const transferSchema = z.object({
  account: z.string().min(1, 'Selecione a conta.'),
  pixKey: z.string().trim().min(1, 'Informe a chave Pix.'),
  amount: amountSchema,
  description: z.string().max(255, 'Use até 255 caracteres.'),
  scheduledAt: z
    .string()
    .refine(
      (value) =>
        !value ||
        (Number.isFinite(new Date(value).getTime()) &&
          new Date(value) > new Date()),
      'Escolha uma data futura válida.',
    ),
});
export const chargeSchema = z.object({
  bankAccountId: z.string().min(1, 'Selecione a conta.'),
  amount: amountSchema,
  description: z.string().max(255, 'Use até 255 caracteres.'),
});
