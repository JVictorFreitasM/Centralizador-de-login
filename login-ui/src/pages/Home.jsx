// src/pages/Home.jsx
// Menu central (OS 13) - destino padrao pos-login quando nao ha return_to
// (ex.: usuario acessou /login-ui direto, sem vir do /authorize de um
// sistema especifico). Lista os sistemas com acesso ativo concedido.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../lib/useTheme';
import { getMe, getMySystems, logout, ApiError } from '../lib/api';

export default function Home() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useTheme();
  const [user, setUser] = useState(null);
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    Promise.all([getMe(), getMySystems()])
      .then(([me, mySystems]) => {
        if (me.mustChangePassword) {
          // Nao deveria acontecer no fluxo normal (o Login ja encaminha pra
          // troca de senha antes de chegar aqui) - rede de seguranca pra
          // quem navegar direto pra /home com uma sessao nesse estado.
          navigate('/change-password-ui', { replace: true });
          return;
        }
        setUser(me);
        setSystems(mySystems);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate('/login-ui', { replace: true });
          return;
        }
        setError('Não foi possível carregar seus sistemas. Tente novamente.');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // Mesmo se a chamada falhar (ex.: sessao ja expirada), manda pro
      // login - nao ha por que travar o usuario aqui.
    } finally {
      navigate('/login-ui', { replace: true });
    }
  };

  const handleOpenSystem = (system) => {
    // Navegacao de pagina inteira de proposito - inicia o /authorize de
    // verdade (o usuario ja tem sessao do IdP, entao resolve direto pro
    // code, sem pedir login de novo).
    window.location.href = system.authorizeUrl;
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.1rem 1.5rem',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-soft)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              background: 'linear-gradient(135deg, var(--accent), rgba(56, 189, 248, 0.85))',
            }}
          >
            <i className="fas fa-shield-halved"></i>
          </div>
          <strong>IdP</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {user && (
            <span className="topbar-badge">
              <i className="fas fa-user"></i> {user.name}
            </span>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsDark((prev) => !prev)}
            aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            <i className={isDark ? 'fas fa-sun' : 'fas fa-moon'}></i>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout} disabled={loggingOut}>
            <i className="fas fa-right-from-bracket"></i> Sair
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>Seus sistemas</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
          Clique em um sistema pra entrar - você já está autenticado no IdP.
        </p>

        {error && (
          <div className="alert alert-danger">
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--radius-lg)' }}></div>
            ))}
          </div>
        ) : systems.length === 0 && !error ? (
          <div className="empty-state">
            <i className="fas fa-box-open"></i>
            <h4>Você ainda não tem acesso a nenhum sistema</h4>
            <p>Entre em contato com o TI pra solicitar acesso.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {systems.map((system) => (
              <button
                key={system.systemId}
                onClick={() => handleOpenSystem(system)}
                className="card"
                style={{
                  padding: '1.4rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  font: 'inherit',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    fontSize: '1.05rem',
                    marginBottom: '0.9rem',
                    background: 'linear-gradient(135deg, var(--accent), rgba(56, 189, 248, 0.85))',
                  }}
                >
                  <i className="fas fa-server"></i>
                </div>
                <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>{system.name}</div>
                <span className="badge info">{system.role}</span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
