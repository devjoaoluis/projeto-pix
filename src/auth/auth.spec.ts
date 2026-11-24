/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import {
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import helmet from 'helmet';
import * as request from 'supertest';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { JwtTokenService } from './jwt-token.service';
import { hashPassword, verifyPassword } from './password.util';
import { AccountAccessGuard } from './guards/account-access.guard';
import {
  computeWebhookSignature,
  WebhookSignatureGuard,
} from './guards/webhook-signature.guard';
import { UsersRepository } from '../modules/usuarios/users.repository';
import { PixController } from '../pix/pix.controller';
import { PixService } from '../pix/pix.service';
import { PixTransactionController } from '../pix/pix-transaction/pix-transaction.controller';
import { PixTransactionService } from '../pix/pix-transaction/pix-transaction.service';

describe('Security, JWT Auth, Ownership & Hardening', () => {
  describe('password.util & JwtTokenService', () => {
    const jwtService = new JwtTokenService();

    it('deve fazer hash com scrypt e validar senha corretamente', () => {
      const hash = hashPassword('SenhaForte@123');
      expect(hash.startsWith('scrypt:')).toBe(true);
      expect(verifyPassword('SenhaForte@123', hash)).toBe(true);
      expect(verifyPassword('SenhaErrada', hash)).toBe(false);
      expect(verifyPassword('SenhaForte@123', 'invalido')).toBe(false);
    });

    it('deve assinar e verificar token JWT válido e rejeitar expirado/adulterado', () => {
      const token = jwtService.sign({
        sub: '11111111-1111-4111-8111-111111111111',
        email: 'user@pix.com',
        role: 'USER',
      });
      const payload = jwtService.verify(token);
      expect(payload.sub).toBe('11111111-1111-4111-8111-111111111111');
      expect(payload.role).toBe('USER');

      const expired = jwtService.sign(
        { sub: 'u1', email: 'u@pix.com', role: 'USER' },
        -10,
      );
      expect(() => jwtService.verify(expired)).toThrow(UnauthorizedException);

      expect(() => jwtService.verify(`${token}x`)).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('WebhookSignatureGuard & AccountAccessGuard', () => {
    const webhookGuard = new WebhookSignatureGuard();

    const mockHttpContext = (req: Record<string, unknown>): ExecutionContext =>
      ({
        switchToHttp: () => ({ getRequest: () => req }),
      }) as unknown as ExecutionContext;

    it('deve validar assinatura HMAC-SHA256 do webhook e rejeitar assinaturas inválidas', () => {
      const payload = {
        pixKey: 'destino@pix.com',
        amount: 150,
        externalTransactionId: 'ext-1',
      };
      const secret =
        process.env.WEBHOOK_SECRET ?? 'dev-pix-webhook-secret-change-me';
      const sig = computeWebhookSignature(JSON.stringify(payload), secret);

      expect(
        webhookGuard.canActivate(
          mockHttpContext({
            headers: { 'x-webhook-signature': `sha256=${sig}` },
            body: payload,
          }),
        ),
      ).toBe(true);

      expect(() =>
        webhookGuard.canActivate(mockHttpContext({ headers: {}, body: payload })),
      ).toThrow(UnauthorizedException);

      expect(() =>
        webhookGuard.canActivate(
          mockHttpContext({
            headers: { 'x-webhook-signature': 'sha256=' + '0'.repeat(64) },
            body: payload,
          }),
        ),
      ).toThrow(UnauthorizedException);
    });

    it('deve aplicar permissões de conta conjunta (OWNER, COLLABORATOR, VIEWER)', async () => {
      const accountId = '22222222-2222-4222-8222-222222222222';
      const ownerId = '11111111-1111-4111-8111-111111111111';
      const viewerId = '33333333-3333-4333-8333-333333333333';
      const collabId = '44444444-4444-4444-8444-444444444444';
      const strangerId = '55555555-5555-4555-8555-555555555555';

      const selectQueue: unknown[][] = [];
      const dbMock = {
        select: jest.fn(() => {
          const rows = selectQueue.shift() ?? [];
          const chain: any = {
            from: jest.fn(() => chain),
            where: jest.fn(() => Promise.resolve(rows)),
          };
          return chain;
        }),
      };

      const guard = new AccountAccessGuard(dbMock as any);

      // Estranho não acessa a conta
      selectQueue.push([{ id: accountId, userId: ownerId }], []);
      await expect(
        guard.canActivate(
          mockHttpContext({
            method: 'GET',
            baseUrl: '/bank-accounts',
            path: `/${accountId}/balance`,
            params: { id: accountId },
            user: { sub: strangerId, email: 's@pix.com', role: 'USER' },
          }),
        ),
      ).rejects.toThrow(ForbiddenException);

      // VIEWER pode consultar (GET), mas não transferir (POST)
      selectQueue.push(
        [{ id: accountId, userId: ownerId }],
        [{ bankAccountId: accountId, userId: viewerId, role: 'VIEWER' }],
      );
      await expect(
        guard.canActivate(
          mockHttpContext({
            method: 'GET',
            baseUrl: '/bank-accounts',
            path: `/${accountId}/balance`,
            params: { id: accountId },
            user: { sub: viewerId, email: 'v@pix.com', role: 'USER' },
          }),
        ),
      ).resolves.toBe(true);

      selectQueue.push(
        [{ id: accountId, userId: ownerId }],
        [{ bankAccountId: accountId, userId: viewerId, role: 'VIEWER' }],
      );
      await expect(
        guard.canActivate(
          mockHttpContext({
            method: 'POST',
            baseUrl: '/pix/transactions',
            path: `/${accountId}/transfer`,
            params: { senderAccountId: accountId },
            user: { sub: viewerId, email: 'v@pix.com', role: 'USER' },
          }),
        ),
      ).rejects.toThrow(ForbiddenException);

      // COLLABORATOR pode transferir, mas não deletar conta
      selectQueue.push(
        [{ id: accountId, userId: ownerId }],
        [{ bankAccountId: accountId, userId: collabId, role: 'COLLABORATOR' }],
      );
      await expect(
        guard.canActivate(
          mockHttpContext({
            method: 'POST',
            baseUrl: '/pix/transactions',
            path: `/${accountId}/transfer`,
            params: { senderAccountId: accountId },
            user: { sub: collabId, email: 'c@pix.com', role: 'USER' },
          }),
        ),
      ).resolves.toBe(true);

      selectQueue.push(
        [{ id: accountId, userId: ownerId }],
        [{ bankAccountId: accountId, userId: collabId, role: 'COLLABORATOR' }],
      );
      await expect(
        guard.canActivate(
          mockHttpContext({
            method: 'DELETE',
            baseUrl: '/bank-accounts',
            path: `/${accountId}`,
            params: { id: accountId },
            user: { sub: collabId, email: 'c@pix.com', role: 'USER' },
          }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('HTTP Integration (Auth, Helmet, Throttler, Simulate-Payment & Webhook)', () => {
    let app: INestApplication;
    let usersRepoMock: Record<string, jest.Mock>;

    beforeEach(async () => {
      const storedHash = hashPassword('Segredo@123');
      const mockUser = {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Maria',
        cpf: '52998224725',
        email: 'maria@pix.com',
        phone: '11999999999',
        passwordHash: storedHash,
        role: 'USER',
        createdAt: new Date(),
      };

      usersRepoMock = {
        findByEmail: jest.fn().mockImplementation((email: string) =>
          Promise.resolve(email === 'maria@pix.com' ? mockUser : undefined),
        ),
        findByCpf: jest.fn().mockResolvedValue(mockUser),
        findById: jest.fn().mockResolvedValue(mockUser),
        create: jest.fn().mockImplementation((data) =>
          Promise.resolve({
            id: '99999999-9999-4999-8999-999999999999',
            ...data,
            createdAt: new Date(),
          }),
        ),
        createActivityLog: jest.fn().mockResolvedValue({ id: 'log-1' }),
      };

      const moduleRef = await Test.createTestingModule({
        imports: [
          ThrottlerModule.forRoot([{ ttl: 60000, limit: 50 }]),
          AuthModule,
        ],
        controllers: [PixController, PixTransactionController],
        providers: [
          {
            provide: PixService,
            useValue: {
              generatePix: jest.fn(),
              getStatus: jest.fn(),
              simulateWebhookEvent: jest
                .fn()
                .mockResolvedValue({ id: 'tx-1', status: 'PAID' }),
            },
          },
          {
            provide: PixTransactionService,
            useValue: {
              findAll: jest.fn().mockResolvedValue([]),
              receiveWebhook: jest
                .fn()
                .mockResolvedValue({ transaction: { id: 'tx-w1' } }),
            },
          },
          {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
          },
        ],
      })
        .overrideProvider(UsersRepository)
        .useValue(usersRepoMock)
        .compile();

      app = moduleRef.createNestApplication({ rawBody: true });
      app.use(helmet());
      app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
      await app.init();
    });

    afterEach(async () => {
      delete process.env.ALLOW_PAYMENT_SIMULATION;
      if (app) {
        await app.close();
      }
    });

    it('realiza login JWT, expõe headers Helmet, protege rotas sem token e bloqueia simulate-payment em produção', async () => {
      // Sem token -> 401 + header do Helmet
      const unauth = await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
      expect(unauth.headers['x-content-type-options']).toBe('nosniff');

      // Login válido -> 200 com token e sem vazar passwordHash
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'maria@pix.com', password: 'Segredo@123' })
        .expect(200);

      expect(loginRes.body.accessToken).toBeDefined();
      expect(loginRes.body.user.passwordHash).toBeUndefined();

      const token = loginRes.body.accessToken as string;

      // /auth/me autenticado -> 200
      const meRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(meRes.body.email).toBe('maria@pix.com');

      // Rota exclusiva ADMIN (/pix/transactions) -> 403 para USER
      await request(app.getHttpServer())
        .get('/pix/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      // simulate-payment bloqueado quando NODE_ENV=production
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'prod-test-secret';
      try {
        const prodToken = app.get(JwtTokenService).sign({
          sub: '11111111-1111-4111-8111-111111111111',
          email: 'maria@pix.com',
          role: 'USER',
        });
        await request(app.getHttpServer())
          .patch('/pix/tx-1/simulate-payment')
          .set('Authorization', `Bearer ${prodToken}`)
          .expect(403);
      } finally {
        process.env.NODE_ENV = prevEnv;
        delete process.env.JWT_SECRET;
      }

      // AuthService deve estar funcional no container DI
      expect(app.get(AuthService)).toBeDefined();
    });
  });
});
