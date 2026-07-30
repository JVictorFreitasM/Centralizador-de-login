// Seed exclusivo de ambiente de desenvolvimento/teste (OS 02, item 3.2).
// Nao roda em producao (guard abaixo) e nao compartilha rota/logica de
// cadastro com o fluxo real de criacao de usuario (src/routes/users.routes.ts)
// - o unico codigo reaproveitado daqui e a funcao de hash de senha.
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { hashPassword } from "../src/lib/password";
import { sha256Hex } from "../src/lib/hash";

if (process.env.NODE_ENV === "production") {
  console.error("Seed de desenvolvimento recusado: NODE_ENV=production.");
  process.exit(1);
}

const prisma = new PrismaClient();

// Senha fixa e conhecida, exclusiva de ambiente de dev/teste - nunca usada
// no caminho de cadastro real (que sempre gera senha temporaria aleatoria).
const DEV_SEED_PASSWORD = "123";

// Por padrao os usuarios de seed nascem com mustChangePassword=true, igual
// ao fluxo real. Passe --skip-force-change para pular isso por conveniencia
// em dev (nunca disponivel via cadastro real).
const skipForceChange = process.argv.includes("--skip-force-change");

async function main() {
  const devPasswordHash = await hashPassword(DEV_SEED_PASSWORD);

  // Usuario de TI (bootstrap) - sem createdBy, pois e o primeiro cadastro.
  const tiUser = await prisma.user.upsert({
    where: { email: "ti@copperline.com.br" },
    update: {
      passwordHash: devPasswordHash,
      active: true,
      isTI: true,
      mustChangePassword: !skipForceChange,
    },
    create: {
      name: "TI - Administrador",
      email: "ti@copperline.com.br",
      passwordHash: devPasswordHash,
      active: true,
      isTI: true,
      mustChangePassword: !skipForceChange,
    },
  });

  // Usuario comum de teste, criado pelo TI acima, pra exercitar login e
  // troca de senha obrigatoria sem depender de rota real.
  const testUser = await prisma.user.upsert({
    where: { email: "usuario.teste@copperline.com.br" },
    update: {
      passwordHash: devPasswordHash,
      active: true,
      isTI: false,
      mustChangePassword: !skipForceChange,
    },
    create: {
      name: "Usuario de Teste",
      email: "usuario.teste@copperline.com.br",
      passwordHash: devPasswordHash,
      active: true,
      isTI: false,
      mustChangePassword: !skipForceChange,
      createdById: tiUser.id,
    },
  });

  // Sistema fake, so pra validar o fluxo de modelagem (RBAC por sistema) e
  // exercitar /authorize + /token (OS 03). O client_secret em texto puro so
  // existe no momento da criacao - reseeds subsequentes reaproveitam o
  // system existente (upsert) sem poder reimprimir um secret que ja nao
  // temos mais em texto puro.
  let system = await prisma.system.findUnique({ where: { slug: "sistema-exemplo" } });
  let clientSecret: string | null = null;
  if (!system) {
    clientSecret = randomBytes(32).toString("hex");
    system = await prisma.system.create({
      data: {
        name: "Sistema Exemplo",
        slug: "sistema-exemplo",
        clientId: randomBytes(16).toString("hex"),
        clientSecretHash: sha256Hex(clientSecret),
        redirectUris: ["http://localhost:3001/callback"],
        active: true,
      },
    });
  }

  const [comumRole, adminRole] = await Promise.all([
    prisma.role.upsert({
      where: { systemId_name: { systemId: system.id, name: "comum" } },
      update: {},
      create: { systemId: system.id, name: "comum", description: "Acesso padrao ao sistema" },
    }),
    prisma.role.upsert({
      where: { systemId_name: { systemId: system.id, name: "admin" } },
      update: {},
      create: { systemId: system.id, name: "admin", description: "Acesso administrativo ao sistema" },
    }),
  ]);

  // Concede ao usuario de teste acesso "comum" ao sistema fake, necessario
  // pra exercitar o fluxo /authorize -> /token de ponta a ponta (OS 03).
  const existingAccess = await prisma.userSystemAccess.findFirst({
    where: { userId: testUser.id, systemId: system.id, revokedAt: null },
  });
  if (!existingAccess) {
    await prisma.userSystemAccess.create({
      data: {
        userId: testUser.id,
        systemId: system.id,
        roleId: comumRole.id,
        grantedById: tiUser.id,
      },
    });
  }

  console.log("Seed concluido:");
  console.log({
    tiUser: tiUser.email,
    testUser: testUser.email,
    devPassword: DEV_SEED_PASSWORD,
    mustChangePassword: !skipForceChange,
    system: system.slug,
    clientId: system.clientId,
    roles: [comumRole.name, adminRole.name],
    testUserRoleOnSystem: comumRole.name,
  });
  if (clientSecret) {
    console.log(`Client secret (texto puro, so aparece aqui na criacao): ${clientSecret}`);
  } else {
    console.log("System 'sistema-exemplo' ja existia - client secret nao e reimprimido (so existe hasheado).");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
