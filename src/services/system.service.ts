import { randomBytes } from "crypto";
import { systemRepository } from "../repositories/system.repository";
import { sha256Hex } from "../lib/hash";
import type {
  CreateSystemDTO,
  CreateSystemResponseDTO,
  RegenerateSecretResponseDTO,
  SystemResponseDTO,
  UpdateSystemDTO,
} from "../dtos/system.dto";
import { SlugAlreadyExistsError, SystemNotFoundError } from "../errors/domain.errors";
import { isUniqueConstraintError } from "../lib/prismaErrors";

function toSystemResponseDTO(system: {
  id: string;
  name: string;
  slug: string;
  clientId: string;
  redirectUris: string[];
  active: boolean;
  createdAt: Date;
}): SystemResponseDTO {
  return {
    id: system.id,
    name: system.name,
    slug: system.slug,
    clientId: system.clientId,
    redirectUris: system.redirectUris,
    active: system.active,
    createdAt: system.createdAt,
  };
}

function generateClientSecret(): string {
  return randomBytes(32).toString("hex");
}

export const systemService = {
  async listSystems(): Promise<SystemResponseDTO[]> {
    const systems = await systemRepository.findAll();
    return systems.map(toSystemResponseDTO);
  },

  async createSystem(dto: CreateSystemDTO): Promise<CreateSystemResponseDTO> {
    const clientId = randomBytes(16).toString("hex");
    const clientSecret = generateClientSecret();

    try {
      const system = await systemRepository.create({
        name: dto.name,
        slug: dto.slug,
        clientId,
        clientSecretHash: sha256Hex(clientSecret),
        redirectUris: dto.redirectUris,
      });

      return { ...toSystemResponseDTO(system), clientSecret };
    } catch (err) {
      if (isUniqueConstraintError(err, "slug")) {
        throw new SlugAlreadyExistsError();
      }
      throw err;
    }
  },

  async updateSystem(id: string, dto: UpdateSystemDTO): Promise<SystemResponseDTO> {
    const existing = await systemRepository.findById(id);
    if (!existing) {
      throw new SystemNotFoundError();
    }

    const updated = await systemRepository.update(id, dto);
    return toSystemResponseDTO(updated);
  },

  async regenerateSecret(id: string): Promise<RegenerateSecretResponseDTO> {
    const existing = await systemRepository.findById(id);
    if (!existing) {
      throw new SystemNotFoundError();
    }

    const clientSecret = generateClientSecret();
    await systemRepository.updateSecretHash(id, sha256Hex(clientSecret));

    return { id, clientSecret };
  },
};
