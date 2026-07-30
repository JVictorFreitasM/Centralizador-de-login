import { asyncHandler } from "../lib/asyncHandler";
import { ChangeAccessRoleSchema, GrantAccessSchema } from "../dtos/userSystemAccess.dto";
import { parseOrThrow } from "../lib/validate";
import { userSystemAccessService } from "../services/userSystemAccess.service";

export const accessController = {
  listForUser: asyncHandler(async (req, res) => {
    const accesses = await userSystemAccessService.listAccessForUser(req.params.userId);
    res.json(accesses);
  }),

  grant: asyncHandler(async (req, res) => {
    const dto = parseOrThrow(GrantAccessSchema, req.body ?? {});
    const result = await userSystemAccessService.grantAccess(dto, req.user!.id);
    res.status(201).json(result);
  }),

  revoke: asyncHandler(async (req, res) => {
    await userSystemAccessService.revokeAccess(req.params.id, req.user!.id);
    res.status(204).send();
  }),

  changeRole: asyncHandler(async (req, res) => {
    const dto = parseOrThrow(ChangeAccessRoleSchema, req.body ?? {});
    const result = await userSystemAccessService.changeAccessRole(req.params.id, dto, req.user!.id);
    res.json(result);
  }),
};
