import { asyncHandler } from "../lib/asyncHandler";
import { CreateSystemSchema, UpdateSystemSchema } from "../dtos/system.dto";
import { parseOrThrow } from "../lib/validate";
import { systemService } from "../services/system.service";

export const systemController = {
  list: asyncHandler(async (_req, res) => {
    const systems = await systemService.listSystems();
    res.json(systems);
  }),

  create: asyncHandler(async (req, res) => {
    const dto = parseOrThrow(CreateSystemSchema, req.body ?? {});
    const result = await systemService.createSystem(dto);
    res.status(201).json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const dto = parseOrThrow(UpdateSystemSchema, req.body ?? {});
    const result = await systemService.updateSystem(req.params.id, dto);
    res.json(result);
  }),

  regenerateSecret: asyncHandler(async (req, res) => {
    const result = await systemService.regenerateSecret(req.params.id);
    res.json(result);
  }),
};
