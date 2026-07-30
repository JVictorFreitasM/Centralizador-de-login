// src/pages/TrocarSenha.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi, getErrorMessage } from '../services/api';

export default function TrocarSenha() {
  const { refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      await refresh();
      navigate('/usuarios', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Nao foi possivel trocar a senha.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: '1.5rem',
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <div className="card-body">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: 56,
                height: 56,
                margin: '0 auto 1rem',
                borderRadius: 18,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontSize: '1.3rem',
                background: 'linear-gradient(135deg, var(--warning), #fbbf24)',
              }}
            >
              <i className="fas fa-key"></i>
            </div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>Troca de senha obrigatória</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Defina uma nova senha antes de continuar. A senha temporária não pode mais ser usada depois disso.
            </p>
          </div>

          {error && (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Senha atual (temporária)</label>
              <input
                className="form-input"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
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
            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? (
                <><i className="fas fa-spinner fa-spin"></i> Salvando...</>
              ) : (
                <><i className="fas fa-check"></i> Trocar senha</>
              )}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => logout()}
              disabled={submitting}
              style={{ width: '100%', marginTop: '0.75rem' }}
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
