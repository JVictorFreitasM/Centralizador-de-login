# ✅ Checklist de Execução da OS - Documentação de Sistemas

**Imprima ou revise este checklist enquanto trabalha.**

---

## ⭐ DECISÃO INICIAL: IdP como Repositório Separado?

Antes de começar, decida:

- [ ] **Cenário A:** Manter IdP no workspace atual (simples, ~14h)
- [ ] **Cenário B:** Criar repositório novo para IdP (escalável, ~18h)

Se escolheu **Cenário B**, adicionar também:
- [ ] Criar novo repositório em `/idp` (fora do workspace atual)
- [ ] Copiar estrutura de `Centralizador-de-login/` para novo repo
- [ ] Configurar GitHub Actions (template fornecido na OS)
- [ ] Preparar publicação do `idp-client` em npm registry

---

## 🔐 SISTEMA 1: Centralizador de Login (IdP) ⭐ PRIORITÁRIO

### Fase 1: Análise (IdP é especial - mais aprofundado)
- [ ] Estrutura verificada: `/src`, `/admin-frontend`, `/login-ui`, `/idp-client`, `/prisma`
- [ ] `package.json` revisado (versões, dependências de segurança)
- [ ] `.env.example` conferido com código real
- [ ] `docker-compose.yml` analisado
- [ ] Rodando em `http://localhost:3000`
- [ ] Chaves RSA existem e válidas (`keys/private.pem`, `keys/public.pem`)
- [ ] PostgreSQL acessível + migrations aplicadas

### Fase 2: Documentação Detalhada (3h - maior que outros sistemas)

#### 2.1: README.md Principal
- [ ] Descrição: Autenticação centralizada OAuth2 Authorization Code
- [ ] Stack: Node.js, Express, TypeScript, Prisma, PostgreSQL
- [ ] Setup com Docker ✓ + sem Docker ✓
- [ ] Variáveis de `.env` tabeladas (15+)
- [ ] Endpoints documentados (GET /authorize, POST /token, POST /revoke, admin routes)
- [ ] Estrutura de pastas comentada

#### 2.2: Arquitetura (docs/ARQUITETURA.md)
- [ ] Componentes principais (API, Login UI, Admin Frontend, JWKS, SessionStore)
- [ ] Decisões de design (por que Prisma sem Entity, por que RS256, etc.)
- [ ] Fluxos de negócio (login local, OAuth2, refresh, revoke)
- [ ] Dependências externas (nenhuma, é isolado)

#### 2.3: Banco de Dados (docs/SCHEMA.md)
- [ ] 8 Tabelas documentadas (User, System, Role, UserSystemAccess, RefreshToken, AuthorizationCode, AuditLog, Session)
- [ ] Relacionamentos explicados
- [ ] Índices críticos listados
- [ ] Política de soft delete vs hard delete
- [ ] Diagrama ER (Mermaid inline)

#### 2.4: Segurança (docs/SEGURANCA.md)
- [ ] Passwords: bcryptjs 10 rounds, nunca em logs
- [ ] Tokens: JWT RS256, access 1h + refresh rotacionado
- [ ] Reuso detection: linhagem inteira revogada
- [ ] Sessão: httpOnly, sameSite, secure em produção
- [ ] Validação: email RFC, password complexidade
- [ ] Rate limiting: 5 tentativas falhas = 15 min bloqueado

#### 2.5: JWT & Validação (docs/JWT_VALIDATION.md)
- [ ] Claims explicadas (sub, email, name, system, role, aud, iss, iat, exp)
- [ ] JWKS endpoint (/.well-known/jwks.json) documentado
- [ ] Key ID (kid) como fingerprint SHA-256
- [ ] Validação passo a passo (cliente)
- [ ] Exemplo de código (validação com jose)

#### 2.6: Client SDK (docs/CLIENT_SDK.md)
- [ ] Instalação (npm install @copperline/idp-client ou file:)
- [ ] Uso básico (createIdpAuth, middleware, rotas)
- [ ] Features: requireAuth, requireRole, renovação automática
- [ ] Exemplo completo (código runnable)
- [ ] Troubleshooting

#### 2.7: Publicação SDK (docs/PUBLICANDO_SDK.md)
- [ ] Opção 1: npm Registry (npmjs.com)
- [ ] Opção 2: GitHub Packages
- [ ] Opção 3: Monorepo local (durante dev)
- [ ] Versionamento semântico
- [ ] Build scripts necessários

### Fase 3: Mídia
- [ ] Screenshot 1: Tela de login
- [ ] Screenshot 2: Painel administrativo (usuários/sistemas/papéis)
- [ ] Screenshot 3: Gestão de acesso (concessão UserSystemAccess)
- [ ] Screenshot 4: Auditoria (AuditLog)

### Fase 4: Diagramas (4 diagramas específicos do IdP)
- [ ] Diagrama 1: OAuth2 Authorization Code Flow (sequence diagram)
- [ ] Diagrama 2: Token Refresh Flow (sequence diagram)
- [ ] Diagrama 3: Schema do Banco (diagrama ER)
- [ ] Diagrama 4: Integração com Sistemas Clientes (architecture)

### Fase 5: README.md + Documentação Final
- [ ] Índice principal com links para `/docs/*`
- [ ] Estrutura: Visão Geral → Pré-req → Setup → Endpoints → Screenshots → Arquitetura → Integrações → Troubleshooting
- [ ] Sem informações sensíveis
- [ ] Links internos funcionam
- [ ] Cross-links para documentação de Client SDK
- [ ] **Se Cenário B:** Preparar estrutura de novo repositório

**Status:** ⬜ A fazer | 🔄 Em progresso | ✅ Concluído

---

## 📊 SISTEMA 2: Farol de Metas

### Fase 1: Análise
- [ ] Estrutura verificada: `/src` (backend), `/frontend` (React), `/prisma`
- [ ] `package.json` revisado
- [ ] `.env.example` conferido
- [ ] `docker-compose.yml` analisado
- [ ] Rodando em `http://localhost:5174`

### Fase 2: Documentação
- [ ] Descrição: Sistema de acompanhamento de metas e indicadores (IC/IV)
- [ ] Stack documentada (Node.js, React 18, TypeScript, Prisma, PostgreSQL)
- [ ] Setup com Docker ✓ + sem Docker ✓
- [ ] Variáveis de `.env` tabeladas
- [ ] Endpoints principais documentados (metas, indicadores, dashboards, relatórios)
- [ ] Estrutura de pastas comentada

### Fase 3: Mídia
- [ ] Screenshot 1: Tela de login (via IdP)
- [ ] Screenshot 2: Dashboard de metas/indicadores
- [ ] Screenshot 3: Tela de relatório ou gráfico

### Fase 4: Diagramas
- [ ] Diagrama de arquitetura (backend API, React frontend, Postgres, Redis optional)
- [ ] Diagrama de integração com IdP (OAuth2 flow)

### Fase 5: README.md
- [ ] Mesmo padrão de índice
- [ ] Seção de Autenticação via IdP (client SDK)
- [ ] Explicação de IC → IV → Meta → Acumulado
- [ ] Links para a documentação do IdP

**Status:** ⬜ A fazer | 🔄 Em progresso | ✅ Concluído

---

## 📺 SISTEMA 3: Gerenciamento de TVs

### Fase 1: Análise
- [ ] Estrutura verificada: `/src` (backend EJS), `/prisma`
- [ ] `package.json` revisado
- [ ] `.env.example` conferido
- [ ] `docker-compose.yml` analisado
- [ ] Rodando em `http://localhost:3001` (ou outra porta)

### Fase 2: Documentação
- [ ] Descrição: Sistema de gerenciamento de displays, upload de vídeos, RBAC
- [ ] Stack documentada (Node.js, Express, EJS, Multer, Prisma, PostgreSQL)
- [ ] Setup com Docker ✓ + sem Docker ✓
- [ ] Variáveis de `.env` tabeladas
- [ ] Endpoints/rotas principais documentados
- [ ] Estrutura de pastas comentada

### Fase 3: Mídia
- [ ] Screenshot 1: Tela de login / dashboard
- [ ] Screenshot 2: Tela de gerenciamento de TVs/displays
- [ ] Screenshot 3: Tela de upload de vídeos

### Fase 4: Diagramas
- [ ] Diagrama de arquitetura (backend + EJS, Multer para upload, DB)
- [ ] Diagrama de integração com IdP

### Fase 5: README.md
- [ ] Índice completo
- [ ] Seção de Autenticação via IdP
- [ ] Documentação de permissões (RBAC)
- [ ] Como fazer upload de vídeos

**Status:** ⬜ A fazer | 🔄 Em progresso | ✅ Concluído

---

## 💼 SISTEMA 4: Contracheque Bot

### Fase 1: Análise
- [ ] Estrutura verificada: `/backend`, `/frontend`, `/worker`, `/prisma`
- [ ] `package.json` revisado
- [ ] `.env.example` conferido
- [ ] `docker-compose.yml` analisado (postgres, redis, backend, worker, frontend nginx)
- [ ] Rodando em `http://localhost:5173`

### Fase 2: Documentação
- [ ] Descrição: Automação de envio de contracheques via WhatsApp + Evolution API + WK Radar
- [ ] Stack documentada (Node.js, React, Express, BullMQ, Redis, Postgres, Evolution API)
- [ ] Setup com Docker ✓ + sem Docker ✓
- [ ] Variáveis de `.env` tabeladas (WK_USUARIO, WK_SENHA, EVOLUTION API key, etc.)
- [ ] Endpoints principais documentados (upload, dashboard, SSE de progresso)
- [ ] Estrutura de pastas comentada

### Fase 3: Mídia
- [ ] Screenshot 1: Dashboard de indicadores (pendentes, enviados, erros)
- [ ] Screenshot 2: Tela de upload de PDFs
- [ ] Screenshot 3: Acompanhamento de lote em progresso (SSE)

### Fase 4: Diagramas
- [ ] Diagrama de arquitetura (backend, worker, redis, postgres, integração WK Radar + Evolution)
- [ ] Diagrama de fluxo: sincronização → processamento PDF → fila → envio WhatsApp
- [ ] Diagrama de integração com IdP

### Fase 5: README.md
- [ ] Índice completo
- [ ] Seção de Autenticação via IdP
- [ ] Visão geral do fluxo (WK Radar → PDF → WhatsApp)
- [ ] Documentação de variáveis de integração (Evolution API, WK Radar)
- [ ] Explicação de BullMQ + Worker

**Status:** ⬜ A fazer | 🔄 Em progresso | ✅ Concluído

---

## 🌐 DOCUMENTAÇÃO CENTRALIZADA (Workspace)

### Raiz do Workspace
- [ ] **SISTEMAS.md**: Index de todos os 4 sistemas + descições rápidas + links
- [ ] **ARQUITETURA_GLOBAL.md**: Diagrama mostrando os 4 comunicando-se
  - IdP centralizado
  - Farol, TVs, Contracheque conectados ao IdP
  - Contracheque com integrações WK Radar + Evolution
- [ ] **GUIA_DESENVOLVIMENTO.md**: Como fazer setup do workspace inteiro

**Status:** ⬜ A fazer | 🔄 Em progresso | ✅ Concluído

---

## 🎯 Critérios de Aceitação (Final Checklist)

### README.md Quality
- [ ] Cada sistema tem README.md atualizado
- [ ] Mínimo 2 screenshots por sistema (total 8+)
- [ ] Mínimo 1 diagrama de arquitetura por sistema
- [ ] Índice com links funcionando
- [ ] Setup com Docker funcionando
- [ ] Setup sem Docker documentado
- [ ] Variáveis de `.env` tabeladas
- [ ] Endpoints tabelados (mínimo)
- [ ] Estrutura de pastas comentada

### Fluxo de Autenticação
- [ ] Documentado o fluxo OAuth2 Authorization Code
- [ ] Explicado como o Client SDK funciona
- [ ] Diagramas do fluxo (sequence ou flowchart)
- [ ] Variáveis de IdP documentadas (IDP_URL, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

### Diagramas & Visuais
- [ ] 4 diagramas de arquitetura (um por sistema)
- [ ] 1 diagrama de integração global (os 4 sistemas + IdP)
- [ ] 1+ diagramas de fluxo de autenticação
- [ ] 8+ screenshots funcionais (ao menos 2 por sistema)

### Segurança & Conformidade
- [ ] ✅ Nenhum secret/token/password real exposto
- [ ] ✅ Nenhuma informação confidencial em screenshots
- [ ] ✅ `.env.example` tem placeholders, não valores reais
- [ ] ✅ Documentação aponta para `.env.example`, não `.env`

### Navegabilidade
- [ ] ✅ Índice em cada README.md
- [ ] ✅ Links internos funcionam (relativos)
- [ ] ✅ Markdown bem formatado (sem erros de sintaxe)
- [ ] ✅ SISTEMAS.md na raiz com links para cada README

---

## 🎯 RESUMO DE DECISÃO: Cenário A vs B

### Cenário A: Manter IdP no Workspace (14h)
```
✅ QUANDO ESCOLHER:
- Time pequeno
- Só 3-4 sistemas clientes
- Desenvolvimento ativo (muitas mudanças)
- Não precisa versionamento rigoroso

❌ DESVANTAGENS:
- Workspace fica maior
- Difícil adicionar novos sistemas depois
- Sem versionamento independente

⏱️ DURAÇÃO: 14h (distribuído 4 dias)
```

### Cenário B: Repositório Separado para IdP (18h)
```
✅ QUANDO ESCOLHER:
- Escalabilidade é prioridade
- Múltiplos times consumindo IdP
- Quer versionamento semântico
- Pretende publicar em npm registry

✅ VANTAGENS:
- Separação de concerns clara
- Cada sistema pull do npm
- Versionar independentemente
- Mais profissional

⏱️ DURAÇÃO: 18h (distribuído 5 dias)
```

**Recomendação:** Comece com **Cenário A**. Se em 3 meses estiver pronto, migre para **Cenário B** sem problema.

---

## 📋 Orientações Rápidas Durante Execução

### Tirar Screenshot
1. Abrir o sistema em `http://localhost:<porta>`
2. Logar com user/password de teste (do seed)
3. Navegar para a tela desejada
4. `Ctrl+Shift+S` (Windows/Linux) ou `Cmd+Shift+4` (Mac)
5. Salvar em `/screenshots/0X-descricao.png`

### Criar Diagrama Mermaid
- Use markdown inline:
  ```markdown
  ```mermaid
  graph TD
      A[...] --> B[...]
  ```
  ```

### Testar Setup
```bash
# Com Docker
docker compose up -d
docker compose ps  # todos "Up"

# Sem Docker
npm install
npx prisma migrate deploy
npm run dev
```

### Validar README
1. Ler índice → clicar em cada link
2. Conferir toda informação contra código fonte
3. Rodar instruções de setup
4. Confirmar screenshots existem e são recentes

---

## 🚀 SE ESCOLHEU CENÁRIO B: Tarefas Adicionais

Além de tudo acima, incluir:

### Estrutura de Novo Repositório
- [ ] Criar `/idp/` (novo repositório)
- [ ] Copiar estrutura base (src, login-ui, admin-frontend, idp-client, prisma)
- [ ] `package.json` com versão 1.0.0
- [ ] `README.md` principal
- [ ] Pasta `/docs` com todos os markdown files

### GitHub Actions (CI/CD)
- [ ] `.github/workflows/test-and-publish.yml` criado
- [ ] Workflow roda testes (npm test)
- [ ] Workflow publica SDK em npm.pkg.github.com ao fazer push em main

### Publicação do SDK
- [ ] `idp-client/package.json` tem `publishConfig`
- [ ] Build script: `npm run build:sdk` funciona
- [ ] Chaves de autenticação npm configuradas (GITHUB_TOKEN ou npm token)

### Documentação do Repositório Separado
- [ ] ARQUITETURA.md (estende o IdP do workspace)
- [ ] PUBLICANDO_SDK.md (instruções passo a passo)
- [ ] DEPLOY.md (como fazer deploy da instância IdP)
- [ ] VERSION_MANAGEMENT.md (semver, breaking changes)

### Integração com Sistemas Clientes
- [ ] Cada sistema cliente agora `npm install @copperline/idp-client@^1.0.0`
- [ ] Documentar atualização de versão (como fazer)
- [ ] Criar changelog público

---

## 📞 Ajuda Rápida

**Pergunta:** Aonde colo as screenshots?  
**Resposta:** Em `/screenshots/` no raiz de cada sistema. Criar pasta se não existir.

**Pergunta:** O README remoto tem informação diferente, qual uso?  
**Resposta:** Use o código local como fonte de verdade. README remoto pode estar desatualizado.

**Pergunta:** Posso incluir dados reais de produção?  
**Resposta:** Não. Sempre use dados de teste/seed, placeholders para variáveis sensíveis.

**Pergunta:** Quantos diagramas preciso por sistema?  
**Resposta:** Mínimo 1 (arquitetura). Ideal: 1 de arquitetura + 1 de fluxo/integração.

**Pergunta:** Precisa traduzir tudo para português?  
**Resposta:** Comentários e seções do README: sim. Código (variáveis, nomes de funções): não.

---

**Boa sorte! 🚀**

Quando terminar, faça commit de todos os arquivos e relate o status aqui.
