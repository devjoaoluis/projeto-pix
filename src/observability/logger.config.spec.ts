import { Writable } from 'stream';
import { pino } from 'pino';
import {
  PINO_REDACT_PATHS,
  REQUEST_ID_HEADER,
  createLoggerConfig,
  resolveRequestId,
} from './logger.config';
import { MASKED_CPF, REDACTED_VALUE } from './sensitive-data.util';

describe('logger.config', () => {
  describe('resolveRequestId', () => {
    it('deve reutilizar x-request-id recebido no header e devolvê-lo na resposta', () => {
      const setHeader = jest.fn();
      const req = {
        headers: { [REQUEST_ID_HEADER]: 'req-custom-123' },
      } as any;
      const res = { setHeader } as any;

      const id = resolveRequestId(req, res);

      expect(id).toBe('req-custom-123');
      expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'req-custom-123');
    });

    it('deve gerar um UUID quando x-request-id não for informado', () => {
      const setHeader = jest.fn();
      const req = { headers: {} } as any;
      const res = { setHeader } as any;

      const id = resolveRequestId(req, res);

      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, id);
    });
  });

  describe('createLoggerConfig', () => {
    it('deve configurar redact, customProps (requestId) e serializers mascarando CPF e senhas', () => {
      const config = createLoggerConfig();
      const pinoHttp = config.pinoHttp as any;

      expect(pinoHttp.redact.paths).toEqual(PINO_REDACT_PATHS);
      expect(pinoHttp.redact.censor).toBe(REDACTED_VALUE);
      expect(pinoHttp.customProps({ id: 'abc-123' })).toEqual({
        requestId: 'abc-123',
      });

      const serializedReq = pinoHttp.serializers.req({
        id: 'abc-123',
        method: 'POST',
        url: '/users?cpf=12345678901',
        query: { cpf: '12345678901' },
        params: {},
        headers: {
          authorization: 'Bearer secret-token',
          'x-request-id': 'abc-123',
        },
        remoteAddress: '127.0.0.1',
      });

      expect(serializedReq.url).toBe(`/users?cpf=${MASKED_CPF}`);
      expect(serializedReq.query).toEqual({ cpf: MASKED_CPF });
      expect(serializedReq.headers.authorization).toBe(REDACTED_VALUE);
      expect(serializedReq.headers['x-request-id']).toBe('abc-123');
    });

    it('deve emitir logs JSON estruturados mascarando CPF e senhas em objetos e mensagens', () => {
      const lines: string[] = [];
      const stream = new Writable({
        write(chunk, _encoding, callback) {
          lines.push(chunk.toString());
          callback();
        },
      });

      const config = createLoggerConfig();
      const pinoHttp = config.pinoHttp as any;

      const logger = pino(
        {
          level: 'info',
          redact: pinoHttp.redact,
          hooks: pinoHttp.hooks,
          serializers: pinoHttp.serializers,
        },
        stream,
      );

      const child = logger.child({ requestId: 'req-999' });
      child.info(
        {
          cpf: '123.456.789-01',
          password: 'my-secret-password',
          user: { senha: 'abc', cpf: '98765432100' },
        },
        'Operação iniciada para CPF 123.456.789-01 com senha=supersecret',
      );

      expect(lines).toHaveLength(1);
      const parsed = JSON.parse(lines[0]);

      expect(parsed.requestId).toBe('req-999');
      expect(parsed.cpf).toBe(REDACTED_VALUE);
      expect(parsed.password).toBe(REDACTED_VALUE);
      expect(parsed.user.senha).toBe(REDACTED_VALUE);
      expect(parsed.user.cpf).toBe(REDACTED_VALUE);
      expect(parsed.msg).toBe(
        `Operação iniciada para CPF ${MASKED_CPF} com senha=${REDACTED_VALUE}`,
      );
      expect(lines[0]).not.toContain('123.456.789-01');
      expect(lines[0]).not.toContain('98765432100');
      expect(lines[0]).not.toContain('my-secret-password');
      expect(lines[0]).not.toContain('supersecret');
    });
  });
});
