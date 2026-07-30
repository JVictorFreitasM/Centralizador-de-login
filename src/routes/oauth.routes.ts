import { Router } from "express";
import { oauthController } from "../controllers/oauth.controller";

export const oauthRouter = Router();

oauthRouter.get("/authorize", oauthController.authorize);
oauthRouter.post("/token", oauthController.token);
oauthRouter.post("/revoke", oauthController.revoke);
