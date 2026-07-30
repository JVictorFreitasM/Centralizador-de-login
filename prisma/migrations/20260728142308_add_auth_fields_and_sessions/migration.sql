-- AlterEnum
ALTER TYPE "audit_action" ADD VALUE 'PASSWORD_CHANGED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_ti" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "sessions" (
    "sid" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
