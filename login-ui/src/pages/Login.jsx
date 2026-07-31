// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import { login, ApiError } from '../lib/api';
import { safeReturnTo, appendReturnTo } from '../lib/returnTo';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get('return_to'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const data = await login(email, password);

      if (data.mustChangePassword) {
        // Navegacao client-side (nao window.location) - carrega a senha
        // atual em memoria pro proximo formulario, evitando pedir de novo
        // (OS 02-B, 3.2). Se essa pagina for aberta direto (sem passar por
        // aqui - ex.: /authorize redirecionando alguem que ja tinha sessao
        // mas ainda nao trocou a senha), o formulario de troca pede a senha
        // atual de novo.
        navigate(appendReturnTo('/change-password-ui', returnTo), {
          state: { currentPassword: password },
        });
        return;
      }

      if (returnTo) {
        // Navegacao de pagina inteira de proposito - o destino normalmente
        // e o proprio /authorize do IdP (rota de backend, fora do SPA).
        window.location.href = returnTo;
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nao foi possivel entrar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <AuthCard
        icon="fas fa-circle-check"
        iconGradient="linear-gradient(135deg, var(--success), #34d399)"
        title="Login realizado com sucesso"
        subtitle="Você já pode fechar esta janela ou continuar navegando."
      />
    );
  }

  return (
    <AuthCard icon="fas fa-shield-halved" title="IdP - Login Centralizado" subtitle="Entre com sua conta">
      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">E-mail</label>
          <input
            className="form-input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Senha</label>
          <input
            className="form-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
          {submitting ? (
            <><i className="fas fa-spinner fa-spin"></i> Entrando...</>
          ) : (
            <><i className="fas fa-right-to-bracket"></i> Entrar</>
          )}
        </button>
      </form>
    </AuthCard>
  );
}
