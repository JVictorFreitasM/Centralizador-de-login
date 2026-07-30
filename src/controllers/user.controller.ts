import { asyncHandler } from "../lib/asyncHandler";
import { CreateUserSchema, ListUsersQuerySchema, UpdateUserActiveSchema } from "../dtos/user.dto";
import { parseOrThrow } from "../lib/validate";
import { userService } from "../services/user.service";

export const userController = {
  list: asyncHandler(async (req, res) => {
    const query = parseOrThrow(ListUsersQuerySchema, req.query ?? {});
    const result = await userService.listUsers(query);
    res.json(result);
  }),

  create: asyncHandler(async (req, res) => {
    const dto = parseOrThrow(CreateUserSchema, req.body ?? {});
    const result = await userService.createUser(dto, req.user!.id, req.ip);
    res.status(201).json(result);
  }),

  setActive: asyncHandler(async (req, res) => {
    const dto = parseOrThrow(UpdateUserActiveSchema, req.body ?? {});
    const result = await userService.setActive(req.params.id, dto.active, req.user!.id, req.ip);
    res.json(result);
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const result = await userService.resetPassword(req.params.id, req.user!.id, req.ip);
    res.json(result);
  }),
};
