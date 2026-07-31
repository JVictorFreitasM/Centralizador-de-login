import path from "path";
import fs from "fs";
import express, { type Express } from "express";

const LOGIN_UI_DIST = path.join(process.cwd(), "login-ui", "dist");
const LOGIN_UI_INDEX = path.join(LOGIN_UI_DIST, "index.html");

// Serve a UI publica de autenticacao (/login-ui, /change-password-ui) -
// construida separadamente em login-ui/ (React) e servida aqui, na MESMA
// origem do backend, de proposito: assim IDP_LOGIN_URL/IDP_PASSWORD_CHANGE_URL
// continuam paths relativos (sem CORS, sem preocupacao de cookie cross-site
// pro formulario de login chamar POST /login).
//
// Excecao deliberada ao padrao Controller/Service/Repository - isto e
// infraestrutura de serving de arquivo estatico, nao uma rota de API.
export function mountPublicAuthUi(app: Express): void {
  if (!fs.existsSync(LOGIN_UI_INDEX)) {
    console.warn(
      `[login-ui] build nao encontrado em ${LOGIN_UI_DIST} - rode "npm run build" dentro de login-ui/. ` +
        "/login-ui e /change-password-ui vao responder 404 ate la."
    );
    return;
  }

  app.use("/assets", express.static(path.join(LOGIN_UI_DIST, "assets")));
  app.get(["/login-ui", "/change-password-ui"], (_req, res) => {
    res.sendFile(LOGIN_UI_INDEX);
  });
}
