// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Entrar from './pages/Entrar';
import TrocarSenha from './pages/TrocarSenha';
import Usuarios from './pages/Usuarios';
import Sistemas from './pages/Sistemas';
import Acessos from './pages/Acessos';
import Auditoria from './pages/Auditoria';
import './App.css';

const NAV_ITEMS = [
  { section: 'Administração' },
  { path: '/usuarios', icon: 'fas fa-users', label: 'Usuários' },
  { path: '/sistemas', icon: 'fas fa-server', label: 'Sistemas' },
  { path: '/acessos', icon: 'fas fa-key', label: 'Acessos' },
  { path: '/auditoria', icon: 'fas fa-clipboard-list', label: 'Auditoria' },
];

const PAGE_TITLES = {
  '/usuarios': 'Usuários',
  '/sistemas': 'Sistemas',
  '/acessos': 'Acessos',
  '/auditoria': 'Auditoria',
};

function AdminLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const pageTitle = PAGE_TITLES[location.pathname] || 'Painel de Administração';
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-layout">
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo">
              <i className="fas fa-shield-halved"></i>
            </div>
            <div className="sidebar-brand-text">
              <strong>IdP</strong>
              <span>Painel de Administração</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item, index) =>
            item.section ? (
              <div key={`s-${index}`} className="sidebar-section-label">
                {item.section}
              </div>
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                onClick={closeSidebar}
              >
                <i className={item.icon}></i>
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={() => setIsDark((prev) => !prev)}>
            <i className={isDark ? 'fas fa-sun' : 'fas fa-moon'}></i>
            {isDark ? 'Tema Claro' : 'Tema Escuro'}
          </button>
        </div>
      </aside>

      <div className={`sidebar-overlay${sidebarOpen ? ' active' : ''}`} onClick={closeSidebar} />

      <div className="main-content">
        <header className="topbar">
          <button className="mobile-menu-button" onClick={() => setSidebarOpen((open) => !open)} aria-label="Abrir menu">
            <i className="fas fa-bars"></i>
          </button>
          <div>
            <p className="topbar-subtitle">TI - Identity Provider</p>
            <h1 className="topbar-title">{pageTitle}</h1>
          </div>
          <div className="topbar-actions" style={{ gap: '0.75rem' }}>
            <span className="topbar-badge">
              <i className="fas fa-user"></i>
              {user?.name}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => logout()}>
              <i className="fas fa-right-from-bracket"></i> Sair
            </button>
          </div>
        </header>

        <main className="page-content" onClick={closeSidebar}>
          <Routes>
            <Route path="/" element={<Navigate to="/usuarios" replace />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/sistemas" element={<Sistemas />} />
            <Route path="/acessos" element={<Acessos />} />
            <Route path="/auditoria" element={<Auditoria />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/entrar" element={<Entrar />} />
      <Route path="/trocar-senha" element={<TrocarSenha />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<AdminLayout />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
