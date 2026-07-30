import { getPublicJwk } from "../lib/jwtKeys";

export const jwksService = {
  // So a chave publica atual por enquanto - rotacao efetiva (varias chaves
  // simultaneas no array) fica pra OS futura (OS 05, secao 6).
  getJwks() {
    return { keys: [getPublicJwk()] };
  },
};
