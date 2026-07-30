import { PrismaClient } from "@prisma/client";

// Unica instancia do Prisma Client do processo. So repositories/ (e o
// PrismaSessionStore, que implementa o contrato de Store do express-session,
// nao uma consulta de dominio) importam este modulo diretamente.
export const prisma = new PrismaClient();
