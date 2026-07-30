import { Prisma } from "@prisma/client";

// Helpers pra Services reconhecerem erros de constraint do Postgres (via
// Prisma) sem precisar conhecer codigos de erro do Prisma espalhados pelo
// codigo - usados pra traduzir uma violacao de unique/FK num DomainError
// especifico (ex.: SlugAlreadyExistsError, RoleInUseError).
export function isUniqueConstraintError(err: unknown, field?: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
    return false;
  }
  if (!field) {
    return true;
  }
  const target = err.meta?.target;
  if (Array.isArray(target)) {
    return target.includes(field);
  }
  return typeof target === "string" && target.includes(field);
}

export function isForeignKeyConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003";
}
