import type { RequestHandler } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { LoginSchema, PasswordChangeSchema, type MeResponseDTO } from "../dtos/auth.dto";
import { parseOrThrow } from "../lib/validate";
import { authService } from "../services/auth.service";
import { oauthService } from "../services/oauth.service";
import { userSystemAccessService } from "../services/userSystemAccess.service";

export const authController = {
  // Passthrough puro (so seleciona campos ja carregados por requireAuth,
  // nenhuma logica de negocio) - por isso nao passa por um Service.
  me: ((req, res) => {
    const user = req.user!;
    const body: MeResponseDTO = {
      id: user.id,
      name: user.name,
      email: user.email,
      active: user.active,
      mustChangePassword: user.mustChangePassword,
      isTI: user.isTI,
    };
    res.json(body);
  }) satisfies RequestHandler,

  // OS 13: sempre o usuario da PROPRIA sessao (req.user.id) - nunca um
  // userId vindo de query/params/body, pra nao vazar acesso de outra pessoa.
  mySystems: asyncHandler(async (req, res) => {
    const systems = await userSystemAccessService.listSystemsForCurrentUser(req.user!.id);
    res.json(systems);
  }),

  login: asyncHandler(async (req, res) => {
    const dto = parseOrThrow(LoginSchema, req.body ?? {});
    const user = await authService.login(dto, req.ip);

    // Regenera o id de sessao no login (mitiga session fixation).
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });
    req.session.userId = user.id;

    res.json({ mustChangePassword: user.mustChangePassword });
  }),

  logout: asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => (err ? reject(err) : resolve()));
    });
    res.clearCookie("idp.sid");

    await authService.logout(userId, req.ip);

    res.status(204).send();
  }),

  // GET /session/end: contraparte navegavel do /logout acima, chamada pelo
  // idp-client (createLogoutHandler) via redirect apos encerrar a sessao
  // LOCAL do sistema cliente - e o unico jeito de tambem encerrar a sessao
  // do IdP (cookie httpOnly desta origem, que o backend do sistema cliente
  // nao enxerga). Idempotente de proposito: sem sessao ativa, so redireciona.
  endSession: asyncHandler(async (req, res) => {
    const clientId = typeof req.query.client_id === "string" ? req.query.client_id : undefined;
    const postLogoutRedirectUri =
      typeof req.query.post_logout_redirect_uri === "string" ? req.query.post_logout_redirect_uri : undefined;

    const redirectTo = await oauthService.resolveEndSessionRedirect(clientId, postLogoutRedirectUri);

    const userId = req.session.userId;
    if (userId) {
      await new Promise<void>((resolve, reject) => {
        req.session.destroy((err) => (err ? reject(err) : resolve()));
      });
      res.clearCookie("idp.sid");
      await authService.logout(userId, req.ip);
    }

    res.redirect(redirectTo);
  }),

  changePassword: asyncHandler(async (req, res) => {
    const dto = parseOrThrow(PasswordChangeSchema, req.body ?? {});
    await authService.changePassword(req.user!, dto, req.ip);
    res.status(204).send();
  }),
};
