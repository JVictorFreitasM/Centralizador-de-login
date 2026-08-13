# Rate Limiting

## O que existe hoje

Só **`POST /login`** tem rate limit - nenhum outro endpoint (incluindo `/token`, `/authorize`, rotas administrativas) tem limite de requisições configurado neste backend.

| Endpoint | Limite | Janela | O que conta |
|---|---|---|---|
| `POST /login` | 5 tentativas | 15 minutos | Só respostas de ERRO (`skipSuccessfulRequests: true`) - um login bem-sucedido não consome a cota |
| Chave | Por IP (`req.ip`, padrão do `express-rate-limit`) | | |

## Headers de resposta

`express-rate-limit` configurado com `standardHeaders: true, legacyHeaders: false` - ou seja, os headers seguem o draft padrão (**sem** prefixo `X-`):

```
RateLimit-Policy: 5;w=900
RateLimit-Limit: 5
RateLimit-Remaining: 3
RateLimit-Reset: 612
```

## Exemplo: limite excedido

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@empresa.com","password":"senha-errada"}'

HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 5
RateLimit-Remaining: 0

{
  "error": "Muitas tentativas de login. Tente novamente mais tarde."
}
```

## Sem exceções por papel

Diferente de esquemas mais amplos, não há hoje uma cota maior pra usuários `isTI` nem qualquer diferenciação por role - o limite de `/login` é o único que existe, e é igual pra todo mundo.
