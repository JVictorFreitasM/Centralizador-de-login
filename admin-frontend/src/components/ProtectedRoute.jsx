// src/components/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.8rem', color: 'var(--accent)' }}></i>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/entrar" state={{ from: location.pathname }} replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/trocar-senha" replace />;
  }

  if (!user.isTI) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1.5rem' }}>
        <div className="empty-state">
          <i className="fas fa-ban"></i>
          <h4>Acesso restrito a TI</h4>
          <p>Sua conta não tem permissão para acessar o painel de administração.</p>
          <button className="btn btn-secondary" onClick={() => logout()} style={{ marginTop: '1rem' }}>
            <i className="fas fa-right-from-bracket"></i> Sair
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
