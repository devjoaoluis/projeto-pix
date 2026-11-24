import {
  MASKED_CPF,
  REDACTED_VALUE,
  maskSensitiveData,
  maskSensitiveString,
} from './sensitive-data.util';

describe('sensitive-data.util', () => {
  describe('maskSensitiveString', () => {
    it('deve mascarar CPF formatado em mensagens de log', () => {
      const msg = 'Usuário com CPF 123.456.789-01 cadastrado com sucesso';
      expect(maskSensitiveString(msg)).toBe(
        `Usuário com CPF ${MASKED_CPF} cadastrado com sucesso`,
      );
    });

    it('deve mascarar CPF sem formatação quando associado à palavra cpf', () => {
      expect(maskSensitiveString('cpf=12345678901&active=true')).toBe(
        `cpf=${MASKED_CPF}&active=true`,
      );
      expect(maskSensitiveString('{"cpf":"12345678901"}')).toBe(
        `{"cpf":"${MASKED_CPF}"}`,
      );
    });

    it('deve mascarar senhas em texto livre e strings de conexão PostgreSQL', () => {
      expect(maskSensitiveString('password=supersecret senha=minhasenha')).toBe(
        `password=${REDACTED_VALUE} senha=${REDACTED_VALUE}`,
      );
      expect(
        maskSensitiveString(
          'Falha em postgresql://root:rootpassword@postgres:5432/banco_pix',
        ),
      ).toBe(
        `Falha em postgresql://root:${REDACTED_VALUE}@postgres:5432/banco_pix`,
      );
    });

    it('deve mascarar tokens Bearer sem corromper UUIDs', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = maskSensitiveString(
        `req ${uuid} Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc.def`,
      );
      expect(result).toContain(uuid);
      expect(result).toContain(`Bearer ${REDACTED_VALUE}`);
      expect(result).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    });
  });

  describe('maskSensitiveData', () => {
    it('deve mascarar campos cpf, password, senha e authorization recursivamente', () => {
      const payload = {
        name: 'João Silva',
        cpf: '12345678901',
        password: 'secret-password',
        nested: {
          senha: '123456',
          user_cpf: '123.456.789-01',
          headers: {
            authorization: 'Bearer my-jwt-token',
            cookie: 'session=abc',
          },
        },
        safeField: 'mantido',
      };

      const masked = maskSensitiveData(payload);

      expect(masked).toEqual({
        name: 'João Silva',
        cpf: MASKED_CPF,
        password: REDACTED_VALUE,
        nested: {
          senha: REDACTED_VALUE,
          user_cpf: MASKED_CPF,
          headers: {
            authorization: REDACTED_VALUE,
            cookie: REDACTED_VALUE,
          },
        },
        safeField: 'mantido',
      });
    });

    it('deve mascarar keyValue quando o objeto representa chave Pix do tipo CPF', () => {
      const masked = maskSensitiveData({
        keyType: 'CPF',
        keyValue: '12345678901',
      });

      expect(masked).toEqual({
        keyType: 'CPF',
        keyValue: MASKED_CPF,
      });
    });

    it('deve preservar keyValue quando a chave Pix não for CPF (ex: EMAIL)', () => {
      const masked = maskSensitiveData({
        keyType: 'EMAIL',
        keyValue: 'joao@example.com',
      });

      expect(masked).toEqual({
        keyType: 'EMAIL',
        keyValue: 'joao@example.com',
      });
    });

    it('deve lidar com referências circulares e instâncias de Error', () => {
      const circular: any = { cpf: '12345678901' };
      circular.self = circular;

      const maskedCircular = maskSensitiveData(circular);
      expect(maskedCircular.cpf).toBe(MASKED_CPF);
      expect(maskedCircular.self).toBe('[Circular]');

      const err = new Error('Erro para CPF 123.456.789-01 senha=abc');
      const maskedErr = maskSensitiveData(err);
      expect(maskedErr).toBeInstanceOf(Error);
      expect(maskedErr.message).toBe(
        `Erro para CPF ${MASKED_CPF} senha=${REDACTED_VALUE}`,
      );
    });
  });
});
