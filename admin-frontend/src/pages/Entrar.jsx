// src/pages/Entrar.jsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';

export default function Entrar() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const me = await login(email, password);
      const from = location.state?.from;
      if (me?.mustChangePassword) {
        navigate('/trocar-senha', { replace: true });
      } else {
        navigate(from && from !== '/entrar' ? from : '/usuarios', { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Nao foi possivel entrar.'));
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
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
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
                background: 'linear-gradient(135deg, var(--accent), rgba(56, 189, 248, 0.85))',
              }}
            >
              <i className="fas fa-shield-halved"></i>
            </div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>IdP - Painel de Administração</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Entre com sua conta de TI</p>
          </div>

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
        </div>
      </div>
    </div>
  );
}
