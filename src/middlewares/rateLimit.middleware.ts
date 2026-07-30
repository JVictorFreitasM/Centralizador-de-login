import rateLimit from "express-rate-limit";

// Conta so tentativas com resposta de erro (skipSuccessfulRequests) - ou
// seja, o limite e sobre tentativas ERRADAS seguidas, nao sobre todo
// request ao /login. Por IP (chave padrao do express-rate-limit).
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Muitas tentativas de login. Tente novamente mais tarde." },
});
