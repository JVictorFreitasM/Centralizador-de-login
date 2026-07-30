// src/pages/Auditoria.jsx
// Somente leitura, de proposito (OS 06, secao 5) - nenhuma acao de
// escrita/exclusao nesta pagina, so consulta com filtros.
import { useEffect, useState } from 'react';
import PaginationComponent from '../components/PaginationComponent';
import { auditApi, systemsApi, usersApi, getErrorMessage } from '../services/api';

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });

const ACTIONS = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'SYSTEM_ACCESS',
  'ACCESS_GRANTED',
  'ACCESS_REVOKED',
  'USER_CREATED',
  'USER_UPDATED',
  'PASSWORD_CHANGED',
  'TOKEN_ISSUED',
];

const ACTION_BADGE = {
  LOGIN_SUCCESS: 'success',
  LOGIN_FAILED: 'danger',
  LOGOUT: 'neutral',
  SYSTEM_ACCESS: 'info',
  ACCESS_GRANTED: 'success',
  ACCESS_REVOKED: 'danger',
  USER_CREATED: 'success',
  USER_UPDATED: 'warning',
  PASSWORD_CHANGED: 'info',
  TOKEN_ISSUED: 'info',
};

export default function Auditoria() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [users, setUsers] = useState([]);
  const [systems, setSystems] = useState([]);
  const [filters, setFilters] = useState({ userId: '', systemId: '', action: '', from: '', to: '' });
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    Promise.all([usersApi.list({ limit: 100 }), systemsApi.list()])
      .then(([usersRes, systemsRes]) => {
        setUsers(usersRes.data.data);
        setSystems(systemsRes.data);
      })
      .catch(() => undefined);
  }, []);

  const fetchLogs = () => {
    setLoading(true);
    setError(null);
    const params = { page, limit };
    if (filters.userId) params.userId = filters.userId;
    if (filters.systemId) params.systemId = filters.systemId;
    if (filters.action) params.action = filters.action;
    if (filters.from) params.from = new Date(filters.from).toISOString();
    if (filters.to) params.to = new Date(filters.to).toISOString();

    auditApi
      .list(params)
      .then((res) => {
        setData(res.data.data);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      })
      .catch((err) => setError(getErrorMessage(err, 'Erro ao buscar auditoria')))
      .finally(() => setLoading(false));
  };

  useEffect(fetchLogs, [page, limit, filters]);

  const handleFilterChange = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
  };

  return (
    <>
      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <h3>Filtros</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Usuário</label>
              <select
                className="form-input"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
              >
                <option value="">Todos</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Sistema</label>
              <select
                className="form-input"
                value={filters.systemId}
                onChange={(e) => handleFilterChange('systemId', e.target.value)}
              >
                <option value="">Todos</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Ação</label>
              <select
                className="form-input"
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
              >
                <option value="">Todas</option>
                {ACTIONS.map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">De</label>
              <input
                className="form-input"
                type="date"
                value={filters.from}
                onChange={(e) => handleFilterChange('from', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Até</label>
              <input
                className="form-input"
                type="date"
                value={filters.to}
                onChange={(e) => handleFilterChange('to', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Eventos</h3>
          <span className="badge neutral">{total} registros</span>
        </div>
        <div className="card-body">
          {loading ? (
            <div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: 42, marginBottom: 8, borderRadius: 6 }}></div>
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-clipboard-list"></i>
              <h4>Nenhum evento encontrado</h4>
              <p>Ajuste os filtros ou aguarde novas ações no sistema.</p>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data/hora</th>
                      <th>Ação</th>
                      <th>Usuário</th>
                      <th>Sistema</th>
                      <th>Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((log) => (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>{dateTimeFormatter.format(new Date(log.createdAt))}</td>
                        <td>
                          <span className={`badge ${ACTION_BADGE[log.action] || 'neutral'}`}>{log.action}</span>
                        </td>
                        <td>{log.userName ? `${log.userName} (${log.userEmail})` : '—'}</td>
                        <td>{log.systemName || '—'}</td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          >
                            <i className={`fas ${expandedId === log.id ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                          </button>
                          {expandedId === log.id && (
                            <pre
                              style={{
                                marginTop: '0.5rem',
                                padding: '0.6rem',
                                background: 'var(--bg-primary)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.78rem',
                                maxWidth: 320,
                                overflowX: 'auto',
                              }}
                            >
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationComponent
                page={page}
                limit={limit}
                total={total}
                totalPages={totalPages}
                onPageChange={setPage}
                onLimitChange={handleLimitChange}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
