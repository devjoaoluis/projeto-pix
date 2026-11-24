import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Request } from 'express';
import { DRIZZLE } from '../../db/db.provider';
import {
  accountPermissions,
  bankAccounts,
  pixTransactions,
} from '../../db/schema';
import type { JwtUserPayload } from '../jwt-token.service';

export type AccountRole = 'OWNER' | 'COLLABORATOR' | 'VIEWER';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AuthenticatedRequest = Request & { user?: JwtUserPayload };

@Injectable()
export class AccountAccessGuard implements CanActivate {
  constructor(
    @Optional()
    @Inject(DRIZZLE)
    private readonly db?: NodePgDatabase<Record<string, never>>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = req.user;

    if (!user || user.role === 'ADMIN' || !this.db) {
      return true;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    // POST /bank-accounts: usuário comum só pode criar conta para si mesmo
    const routePath = `${req.baseUrl ?? ''}${req.path ?? ''}`;
    if (
      req.method === 'POST' &&
      (routePath === '/bank-accounts' ||
        routePath === '/api/v1/bank-accounts') &&
      typeof body.userId === 'string' &&
      body.userId !== user.sub
    ) {
      throw new ForbiddenException(
        'Não é permitido criar conta bancária para outro usuário',
      );
    }

    const targetAccountId = await this.resolveTargetAccountId(req, routePath);
    if (!targetAccountId || !UUID_REGEX.test(targetAccountId)) {
      return true;
    }

    const [account] = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, targetAccountId));

    // Se a conta não existe, deixa o service lançar 404 NotFoundException
    if (!account) {
      return true;
    }

    let effectiveRole: AccountRole | null =
      account.userId === user.sub ? 'OWNER' : null;

    if (!effectiveRole) {
      const [permission] = await this.db
        .select()
        .from(accountPermissions)
        .where(
          and(
            eq(accountPermissions.bankAccountId, targetAccountId),
            eq(accountPermissions.userId, user.sub),
          ),
        );

      if (permission) {
        effectiveRole = permission.role as AccountRole;
      }
    }

    if (!effectiveRole) {
      throw new ForbiddenException(
        'Você não possui permissão para acessar esta conta bancária',
      );
    }

    if (req.method === 'GET') {
      return true;
    }

    // Operações exclusivas de OWNER (ou ADMIN): excluir conta, alterar saldo direto, limite diário, bloqueio e gerenciar permissões
    const isOwnerOnlyRoute =
      req.method === 'DELETE' ||
      routePath.includes('/balance') ||
      routePath.includes('/daily-limit') ||
      routePath.includes('/permissions') ||
      routePath.includes('/block') ||
      routePath.includes('/activate');

    if (isOwnerOnlyRoute && effectiveRole !== 'OWNER') {
      throw new ForbiddenException(
        'Apenas o titular (OWNER) pode executar esta operação na conta',
      );
    }

    if (effectiveRole === 'VIEWER') {
      throw new ForbiddenException(
        'Permissão VIEWER permite apenas consultas nesta conta bancária',
      );
    }

    return true;
  }

  private async resolveTargetAccountId(
    req: AuthenticatedRequest,
    routePath: string,
  ): Promise<string | undefined> {
    const params = req.params ?? {};
    if (typeof params.bankAccountId === 'string') return params.bankAccountId;
    if (typeof params.senderAccountId === 'string') {
      return params.senderAccountId;
    }
    if (typeof params.accountId === 'string') return params.accountId;

    if (
      (routePath.startsWith('/bank-accounts') ||
        routePath.startsWith('/api/v1/bank-accounts')) &&
      typeof params.id === 'string'
    ) {
      return params.id;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    if (
      (routePath.endsWith('/pix/generate') ||
        routePath.endsWith('/pix/keys')) &&
      typeof body.bankAccountId === 'string'
    ) {
      return body.bankAccountId;
    }

    // Status/simulação de cobrança Pix e cancelamento de transação: verifica acesso à conta vinculada
    if (
      (routePath.includes('/pix/') ||
        routePath.includes('/pix/transactions/')) &&
      typeof params.id === 'string' &&
      UUID_REGEX.test(params.id) &&
      this.db
    ) {
      const [tx] = await this.db
        .select()
        .from(pixTransactions)
        .where(eq(pixTransactions.id, params.id));

      return tx?.senderAccountId ?? tx?.bankAccountId ?? undefined;
    }

    return undefined;
  }
}
