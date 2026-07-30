import { Store, SessionData } from "express-session";
// PrismaSessionStore implementa o contrato de Store do express-session -
// infraestrutura de sessao, nao uma consulta de dominio, por isso acessa o
// Prisma direto em vez de passar por repositories/ (OS 04-B, secao 3.4).
import { prisma } from "../prisma/client";

const DEFAULT_PRUNE_INTERVAL_MS = 15 * 60 * 1000;
const FALLBACK_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Store customizado do express-session sobre a tabela `sessions` do Prisma
// (ver prisma/schema.prisma) - mantem sessao do IdP na mesma base/migrations
// do resto do schema, em vez de depender de uma tabela criada por fora do
// Prisma por uma lib como connect-pg-simple.
export class PrismaSessionStore extends Store {
  private pruneTimer: NodeJS.Timeout;

  constructor() {
    super();
    this.pruneTimer = setInterval(() => {
      this.pruneExpired().catch((err) => console.error("[session-store] falha ao limpar sessoes expiradas", err));
    }, DEFAULT_PRUNE_INTERVAL_MS);
    this.pruneTimer.unref();
  }

  private pruneExpired(): Promise<unknown> {
    return prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }

  private resolveExpiresAt(session: SessionData): Date {
    if (session.cookie?.expires) {
      return new Date(session.cookie.expires);
    }
    return new Date(Date.now() + FALLBACK_MAX_AGE_MS);
  }

  get(sid: string, callback: (err: unknown, session?: SessionData | null) => void): void {
    prisma.session
      .findUnique({ where: { sid } })
      .then((record) => {
        if (!record || record.expiresAt.getTime() < Date.now()) {
          callback(null, null);
          return;
        }
        callback(null, JSON.parse(record.data) as SessionData);
      })
      .catch((err) => callback(err));
  }

  set(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    const expiresAt = this.resolveExpiresAt(session);
    const data = JSON.stringify(session);
    prisma.session
      .upsert({
        where: { sid },
        create: { sid, data, expiresAt },
        update: { data, expiresAt },
      })
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    prisma.session
      .delete({ where: { sid } })
      .then(() => callback?.())
      .catch((err: { code?: string }) => {
        // P2025: registro ja nao existia - do ponto de vista do logout, ok.
        if (err?.code === "P2025") {
          callback?.();
          return;
        }
        callback?.(err);
      });
  }

  touch(sid: string, session: SessionData, callback?: () => void): void {
    const expiresAt = this.resolveExpiresAt(session);
    prisma.session
      .update({ where: { sid }, data: { expiresAt } })
      .then(() => callback?.())
      .catch(() => callback?.());
  }
}
