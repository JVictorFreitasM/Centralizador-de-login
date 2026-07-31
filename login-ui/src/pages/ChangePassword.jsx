// src/pages/ChangePassword.jsx
import { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import { changePassword, ApiError } from '../lib/api';
import { safeReturnTo } from '../lib/returnTo';

export default function ChangePassword() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get('return_to'));

  // Vem preenchida quando chega aqui pela navegacao client-side do Login
  // (evita pedir a senha de novo). Se a pagina foi aberta direto - ex.:
  // /authorize redirecionando alguem com sessao ja ativa mas ainda com
  // mustChangePassword=true - esse state nao existe, e o formulario abaixo
  // pede a senha atual como um campo normal.
  const carriedPassword = location.state?.currentPassword;

  const [currentPassword, setCurrentPassword] = useState(carriedPassword ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);

      if (returnTo) {
        window.location.href = returnTo;
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível trocar a senha. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <AuthCard
        icon="fas fa-circle-check"
        iconGradient="linear-gradient(135deg, var(--success), #34d399)"
        title="Senha alterada com sucesso"
        subtitle="Você já pode fechar esta janela ou continuar navegando."
      />
    );
  }

  return (
    <AuthCard
      icon="fas fa-key"
      iconGradient="linear-gradient(135deg, var(--warning), #fbbf24)"
      title="Troca de senha obrigatória"
      subtitle="Defina uma nova senha antes de continuar."
    >
      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {carriedPassword === undefined && (
          <div className="form-group">
            <label className="form-label">Senha atual</label>
            <input
              className="form-input"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Nova senha</label>
          <input
            className="form-input"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <small style={{ color: 'var(--text-muted)' }}>Pelo menos 8 caracteres.</small>
        </div>
        <div className="form-group">
          <label className="form-label">Confirmar nova senha</label>
          <input
            className="form-input"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
          {submitting ? (
            <><i className="fas fa-spinner fa-spin"></i> Salvando...</>
          ) : (
            <><i className="fas fa-check"></i> Trocar senha</>
          )}
        </button>
      </form>
    </AuthCard>
  );
}
