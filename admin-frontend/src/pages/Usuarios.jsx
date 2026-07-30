// src/pages/Usuarios.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchInput from '../components/SearchInput';
import PaginationComponent from '../components/PaginationComponent';
import ConfirmModal from '../components/ConfirmModal';
import SecretRevealModal from '../components/SecretRevealModal';
import { usersApi, getErrorMessage } from '../services/api';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function Usuarios() {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '' });
  const [createError, setCreateError] = useState(null);
  const [creating, setCreating] = useState(false);

  const [confirmDeactivate, setConfirmDeactivate] = useState(null); // usuario alvo
  const [rowActionId, setRowActionId] = useState(null);
  const [reveal, setReveal] = useState(null); // { title, label, value }

  const fetchUsers = () => {
    setLoading(true);
    setError(null);
    usersApi
      .list({ page, limit, search })
      .then((res) => {
        setData(res.data.data);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      })
      .catch((err) => setError(getErrorMessage(err, 'Erro ao buscar usuários')))
      .finally(() => setLoading(false));
  };

  useEffect(fetchUsers, [page, limit, search]);

  const handleSearch = (term) => {
    setSearch(term);
    setPage(1);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const res = await usersApi.create(createForm);
      setCreateOpen(false);
      setCreateForm({ name: '', email: '' });
      fetchUsers();
      setReveal({
        title: 'Usuário criado',
        label: `Senha temporária de ${res.data.email}`,
        value: res.data.tempPassword,
      });
    } catch (err) {
      setCreateError(getErrorMessage(err, 'Erro ao criar usuário'));
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (user) => {
    setRowActionId(user.id);
    setError(null);
    try {
      await usersApi.setActive(user.id, !user.active);
      setConfirmDeactivate(null);
      fetchUsers();
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao atualizar usuário'));
    } finally {
      setRowActionId(null);
    }
  };

  const handleResetPassword = async (user) => {
    setRowActionId(user.id);
    setError(null);
    try {
      const res = await usersApi.resetPassword(user.id);
      setReveal({
        title: 'Senha redefinida',
        label: `Nova senha temporária de ${res.data.email}`,
        value: res.data.tempPassword,
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao resetar senha'));
    } finally {
      setRowActionId(null);
    }
  };

  return (
    <>
      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><i className="fas fa-users"></i></div>
          <div className="stat-info">
            <div className="stat-label">Total de Usuários</div>
            <div className="stat-value">{total}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3>Usuários Cadastrados</h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ width: 260 }}>
              <SearchInput value={search} onSearch={handleSearch} placeholder="Nome ou e-mail..." />
            </div>
            <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
              <i className="fas fa-user-plus"></i> Novo usuário
            </button>
          </div>
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
              <i className="fas fa-users"></i>
              <h4>{search ? 'Nenhum resultado' : 'Nenhum usuário cadastrado'}</h4>
              <p>{search ? 'Tente outro termo de busca.' : 'Crie o primeiro usuário pelo botão acima.'}</p>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Status</th>
                      <th>Criado em</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((user) => (
                      <tr key={user.id}>
                        <td style={{ fontWeight: 500 }}>
                          {user.name}
                          {user.isTI && <span className="badge info" style={{ marginLeft: '0.5rem' }}>TI</span>}
                        </td>
                        <td>{user.email}</td>
                        <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span className={`badge ${user.active ? 'success' : 'neutral'}`}>
                            {user.active ? 'Ativo' : 'Inativo'}
                          </span>
                          {user.mustChangePassword && (
                            <span className="badge warning">Aguardando troca de senha</span>
                          )}
                        </td>
                        <td>{dateFormatter.format(new Date(user.createdAt))}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => navigate(`/acessos?userId=${user.id}`)}
                            >
                              <i className="fas fa-key"></i> Acessos
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={rowActionId === user.id}
                              onClick={() => handleResetPassword(user)}
                            >
                              <i className="fas fa-rotate"></i> Resetar senha
                            </button>
                            <button
                              className={`btn btn-sm ${user.active ? 'btn-danger' : 'btn-primary'}`}
                              disabled={rowActionId === user.id}
                              onClick={() =>
                                user.active ? setConfirmDeactivate(user) : handleToggleActive(user)
                              }
                            >
                              {user.active ? (
                                <><i className="fas fa-ban"></i> Desativar</>
                              ) : (
                                <><i className="fas fa-check"></i> Ativar</>
                              )}
                            </button>
                          </div>
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

      {createOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: 440, width: '100%' }}>
            <div className="card-body">
              <h3 style={{ marginBottom: '1rem' }}>Novo usuário</h3>
              {createError && (
                <div className="alert alert-danger">
                  <i className="fas fa-exclamation-circle"></i> {createError}
                </div>
              )}
              <form onSubmit={handleCreateSubmit}>
                <div className="form-group">
                  <label className="form-label">Nome</label>
                  <input
                    className="form-input"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input
                    className="form-input"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  A senha é gerada automaticamente e exibida uma única vez após a criação.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCreateOpen(false)}
                    disabled={creating}
                  >
                    Cancelar
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={creating}>
                    {creating ? (
                      <><i className="fas fa-spinner fa-spin"></i> Criando...</>
                    ) : (
                      <><i className="fas fa-user-plus"></i> Criar</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {confirmDeactivate && (
        <ConfirmModal
          title="Desativar usuário"
          message={`"${confirmDeactivate.name}" não vai conseguir mais entrar em nenhum sistema, mesmo com a senha correta. Deseja continuar?`}
          confirmLabel="Desativar"
          loading={rowActionId === confirmDeactivate.id}
          onConfirm={() => handleToggleActive(confirmDeactivate)}
          onCancel={() => setConfirmDeactivate(null)}
        />
      )}

      {reveal && (
        <SecretRevealModal
          title={reveal.title}
          label={reveal.label}
          value={reveal.value}
          onClose={() => setReveal(null)}
        />
      )}
    </>
  );
}
