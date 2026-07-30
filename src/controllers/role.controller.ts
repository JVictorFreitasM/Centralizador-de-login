import { asyncHandler } from "../lib/asyncHandler";
import { CreateRoleSchema, UpdateRoleSchema } from "../dtos/role.dto";
import { parseOrThrow } from "../lib/validate";
import { roleService } from "../services/role.service";

export const roleController = {
  listForSystem: asyncHandler(async (req, res) => {
    const roles = await roleService.listRolesForSystem(req.params.systemId);
    res.json(roles);
  }),

  create: asyncHandler(async (req, res) => {
    const dto = parseOrThrow(CreateRoleSchema, req.body ?? {});
    const result = await roleService.createRole(req.params.systemId, dto);
    res.status(201).json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const dto = parseOrThrow(UpdateRoleSchema, req.body ?? {});
    const result = await roleService.updateRole(req.params.id, dto);
    res.json(result);
  }),

  remove: asyncHandler(async (req, res) => {
    await roleService.deleteRole(req.params.id);
    res.status(204).send();
  }),
};
