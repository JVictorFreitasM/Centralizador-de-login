// src/components/AuthCard.jsx
// Layout publico (sem sidebar - ainda nao ha usuario autenticado, OS 02-B
// secao 3.4): cartao centralizado sobre o fundo com gradiente ja usado na
// referencia visual.
import { useTheme } from '../lib/useTheme';

export default function AuthCard({ icon, iconGradient, title, subtitle, children }) {
  const [isDark, setIsDark] = useTheme();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
      }}
    >
      <button
        onClick={() => setIsDark((prev) => !prev)}
        aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        className="btn btn-secondary btn-sm"
        style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }}
      >
        <i className={isDark ? 'fas fa-sun' : 'fas fa-moon'}></i>
      </button>

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
                background: iconGradient || 'linear-gradient(135deg, var(--accent), rgba(56, 189, 248, 0.85))',
              }}
            >
              <i className={icon}></i>
            </div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{title}</h2>
            {subtitle && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{subtitle}</p>}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
