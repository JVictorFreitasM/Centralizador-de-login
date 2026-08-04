import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/session.middleware";
import { loginRateLimiter } from "../middlewares/rateLimit.middleware";

export const authRouter = Router();

authRouter.get("/me", requireAuth, authController.me);
authRouter.get("/me/systems", requireAuth, authController.mySystems);
authRouter.post("/login", loginRateLimiter, authController.login);
authRouter.post("/logout", requireAuth, authController.logout);
authRouter.post("/password/change", requireAuth, authController.changePassword);
