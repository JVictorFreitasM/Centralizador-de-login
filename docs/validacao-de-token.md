# Validação de access_token pelos sistemas clientes

Descreve o passo a passo que qualquer sistema cliente do IdP deve seguir
para validar um `access_token` recebido do `/token` (OS 03) **sem chamar
nenhuma outra rota do IdP** — a validação é local, offline, usando só a
chave pública publicada em `/.well-known/jwks.json` (OS 05). Já implementado
de fato pelo Client SDK (`@copperline/idp-client`, OS 07) — ver
[idp-client/src/verifyToken.ts](../idp-client/src/verifyToken.ts) e
[idp-client/src/jwks.ts](../idp-client/src/jwks.ts).

## Passo a passo

1. **Buscar o JWKS** em `GET /.well-known/jwks.json` e **cachear** a
   resposta por um tempo razoável (ex.: 1h — a resposta já vem com
   `Cache-Control: public, max-age=3600`). Não bater no IdP a cada request;
   não cachear indefinidamente (isso impediria uma rotação de chave futura
   de se propagar).
2. **Localizar a chave pelo `kid`**: decodifique o *header* do JWT (sem
   validar ainda) e pegue o campo `kid`. Procure no array `keys` do JWKS a
   entrada com o mesmo `kid`. Se não encontrar, invalide o cache e busque o
   JWKS de novo uma vez (pode ter havido rotação) — se ainda não encontrar,
   rejeite o token.
3. **Validar a assinatura** (`RS256`) usando a chave pública (JWK) achada
   no passo anterior.
4. **Validar `exp`**: rejeitar se o token já expirou.
5. **Validar `aud`/`system`**: o valor de `aud` (ou `system`) do token deve
   bater com o **próprio** `client_id` (ou slug) do sistema. Isso é
   **obrigatório e não pode ser pulado** — sem essa checagem, um token
   válido emitido para o Sistema A poderia, em tese, ser aceito pelo
   Sistema B, já que ambos confiam na mesma chave pública do IdP. A
   assinatura válida prova que o token veio do IdP; só o `aud` prova que
   ele foi emitido *para este sistema*.
6. Se tudo acima passou, considere a requisição autenticada, usando `sub`
   (id do usuário), `email`, `name` e `role` das claims — sem precisar
   consultar o IdP.

## Exemplo com `jose` (Node/TypeScript)

```ts
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(new URL("https://idp.empresa.local/.well-known/jwks.json"));
// createRemoteJWKSet ja cuida do cache e da localizacao por `kid` (passos 1-2).

async function validarToken(token: string, meuClientId: string) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: process.env.IDP_ISSUER, // mesmo valor de JWT_ISSUER no IdP
    audience: meuClientId,          // passo 5 - jose rejeita automaticamente se nao bater
  });

  // payload.sub, payload.email, payload.name, payload.role
  return payload;
}
```

## Estrutura das claims (OS 05, seção 3.3)

```json
{
  "sub": "uuid-do-usuario",
  "email": "usuario@empresa.com",
  "name": "Nome do Usuario",
  "iss": "idp-centralizador-login",
  "aud": "client_id-do-sistema",
  "system": "farol",
  "role": "gerente",
  "iat": 1234567890,
  "exp": 1234568790
}
```

- `role` já vem resolvido pelo IdP no momento da emissão do token — reflete
  o papel do usuário **naquele sistema específico** (`UserSystemAccess`
  ativo no momento do `/token`), não uma lista de papéis em todos os
  sistemas.
- `system` é o `slug` do sistema (ex.: `"farol"`) — mais legível que decodificar
  `aud` (que é o `client_id`) para saber a qual sistema o token pertence,
  embora ambos apontem para o mesmo sistema e devam ser validados juntos.

## Sem chamada ao IdP

Nenhum dos passos acima requer uma requisição HTTP ao IdP além da busca
(cacheada) do JWKS — é exatamente esse o ganho do padrão: cada sistema
cliente valida tokens offline, sem acoplamento síncrono nem gargalo de
disponibilidade no IdP a cada request autenticado.
