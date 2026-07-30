import type { RequestHandler } from "express";
import { PasswordChangeRequiredError } from "../errors/domain.errors";

// Enquanto mustChangePassword=true, nenhuma rota protegida alem da troca de
// senha (e logout) pode ser acessada.
export const blockIfMustChangePassword: RequestHandler = (req, _res, next) => {
  if (req.user?.mustChangePassword) {
    throw new PasswordChangeRequiredError();
  }
  next();
};
