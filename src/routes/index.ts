import { Router } from "express";
import { authRouter } from "./auth.routes";
import { userRouter } from "./user.routes";
import { oauthRouter } from "./oauth.routes";
import { jwksRouter } from "./jwks.routes";
import { systemRouter } from "./system.routes";
import { roleRouter } from "./role.routes";
import { accessRouter } from "./access.routes";
import { auditLogRouter } from "./auditLog.routes";

export const router = Router();

router.use(authRouter);
router.use("/users", userRouter);
router.use(oauthRouter);
router.use(jwksRouter);
router.use("/systems", systemRouter);
router.use("/roles", roleRouter);
router.use("/access", accessRouter);
router.use("/audit-logs", auditLogRouter);
