import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { cpf, cnpj } from 'cpf-cnpj-validator';

@ValidatorConstraint({ name: 'isPixKey', async: false })
export class IsPixKeyConstraint implements ValidatorConstraintInterface {
  validate(pixKey: string, args: ValidationArguments) {
    if (!pixKey || typeof pixKey !== 'string') return false;

    // Validação de Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(pixKey)) return true;

    // Validação de Telefone (Formato: +5511999999999)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (phoneRegex.test(pixKey)) return true;

    // Validação de CPF ou CNPJ (Removendo pontuações para checar)
    const cleanDoc = pixKey.replace(/[^\d]/g, '');
    if (cleanDoc.length === 11) return cpf.isValid(cleanDoc);
    if (cleanDoc.length === 14) return cnpj.isValid(cleanDoc);

    // Validação de Chave Aleatória (EVP - Formato UUID)
    const evpRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (evpRegex.test(pixKey)) return true;

    return false;
  }

  defaultMessage(args: ValidationArguments) {
    return 'A chave PIX informada é inválida. Formatos aceitos: CPF, CNPJ, Email, Telefone (com +55) ou Chave Aleatória (UUID).';
  }
}

export function IsPixKey(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPixKeyConstraint,
    });
  };
}
