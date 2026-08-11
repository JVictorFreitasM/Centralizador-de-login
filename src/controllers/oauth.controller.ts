import { asyncHandler } from "../lib/asyncHandler";
import { withParams } from "../lib/url";
import { oauthService } from "../services/oauth.service";

// Paginas de UI que ainda nao existem neste backend (login/troca de senha
// visual e assunto de outra OS) - o /authorize so precisa redirecionar pra
// elas preservando o fluxo original em `return_to`.
const LOGIN_UI_URL = process.env.IDP_LOGIN_URL ?? "/login-ui";
const PASSWORD_CHANGE_UI_URL = process.env.IDP_PASSWORD_CHANGE_URL ?? "/change-password-ui";
// OS 17: erro pre-redirecionamento (nao ha redirect_uri confiavel pra devolver
// o erro ao sistema cliente ainda) - mostrado aqui mesmo, no IdP, em vez de JSON cru.
const ERROR_UI_URL = process.env.IDP_ERROR_URL ?? "/erro";

const INVALID_REQUEST_MESSAGES: Record<string, string> = {
  invalid_request: "O link de login esta incompleto. Peca ao sistema de origem pra gerar o link novamente.",
  invalid_client: "Este sistema nao esta cadastrado ou esta desativado no IdP.",
  invalid_redirect_uri: "O endereco de retorno deste login nao esta autorizado para este sistema.",
};

export const oauthController = {
  authorize: asyncHandler(async (req, res) => {
    const clientId = typeof req.query.client_id === "string" ? req.query.client_id : undefined;
    const redirectUri = typeof req.query.redirect_uri === "string" ? req.query.redirect_uri : undefined;
    const responseType = typeof req.query.response_type === "string" ? req.query.response_type : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;

    const decision = await oauthService.authorize(
      { clientId, redirectUri, responseType, sessionUserId: req.session.userId },
      req.ip
    );

    switch (decision.kind) {
      case "invalid_request": {
        const message = INVALID_REQUEST_MESSAGES[decision.body.error] ?? INVALID_REQUEST_MESSAGES.invalid_request;
        res.redirect(withParams(ERROR_UI_URL, { message }));
        return;
      }

      case "need_login": {
        if (decision.destroySession) {
          req.session.destroy(() => undefined);
        }
        const originalUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
        res.redirect(withParams(LOGIN_UI_URL, { return_to: originalUrl }));
        return;
      }

      case "need_password_change": {
        const originalUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
        res.redirect(withParams(PASSWORD_CHANGE_UI_URL, { return_to: originalUrl }));
        return;
      }

      case "redirect_error":
        res.redirect(
          withParams(decision.redirectUri, { error: decision.error, error_description: decision.description, state })
        );
        return;

      case "success":
        res.redirect(withParams(decision.redirectUri, { code: decision.code, state }));
        return;
    }
  }),

  token: asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;

    const result = await oauthService.exchangeToken(
      {
        grantType: typeof body.grant_type === "string" ? body.grant_type : undefined,
        code: typeof body.code === "string" ? body.code : undefined,
        redirectUri: typeof body.redirect_uri === "string" ? body.redirect_uri : undefined,
        clientId: typeof body.client_id === "string" ? body.client_id : undefined,
        clientSecret: typeof body.client_secret === "string" ? body.client_secret : undefined,
        refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : undefined,
      },
      req.ip
    );

    res.json(result);
  }),

  revoke: asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;

    await oauthService.revokeToken(
      {
        token: typeof body.token === "string" ? body.token : undefined,
        clientId: typeof body.client_id === "string" ? body.client_id : undefined,
        clientSecret: typeof body.client_secret === "string" ? body.client_secret : undefined,
      },
      req.ip
    );

    // RFC 7009: sempre 200, sem corpo relevante, independente do token ter
    // sido encontrado ou nao.
    res.status(200).json({});
  }),
};
