import type { RequestHandler } from "express";
import { userRepository } from "../repositories/user.repository";
import { asyncHandler } from "../lib/asyncHandler";
import { ForbiddenTIError, NotAuthenticatedError } from "../errors/domain.errors";

// Carrega o usuario da sessao do IdP a cada request (em vez de confiar em
// dados salvos no cookie/sessao) para que uma desativacao (active=false)
// tenha efeito imediato, mesmo com a sessao ainda valida.
export const requireAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const userId = req.session.userId;
  if (!userId) {
    throw new NotAuthenticatedError();
  }

  const user = await userRepository.findById(userId);
  if (!user || !user.active) {
    req.session.destroy(() => undefined);
    throw new NotAuthenticatedError();
  }

  req.user = user;
  next();
});

export const requireTI: RequestHandler = (req, _res, next) => {
  if (!req.user?.isTI) {
    throw new ForbiddenTIError();
  }
  next();
};
