-- Regra de negocio: um usuario so pode ter UM acesso ATIVO (revoked_at IS NULL)
-- por sistema. Nao expressavel na DSL do Prisma (indice unico parcial), entao
-- e adicionada aqui via SQL puro sobre a tabela criada na migration `init`.
CREATE UNIQUE INDEX "user_system_access_active_user_system_key"
    ON "user_system_access" ("user_id", "system_id")
    WHERE "revoked_at" IS NULL;
