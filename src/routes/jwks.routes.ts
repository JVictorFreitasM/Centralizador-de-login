import { Router } from "express";
import { jwksController } from "../controllers/jwks.controller";

export const jwksRouter = Router();

jwksRouter.get("/.well-known/jwks.json", jwksController.getJwks);
