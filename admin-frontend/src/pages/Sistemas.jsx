// src/pages/Sistemas.jsx
import { useEffect, useState } from 'react';
import SecretRevealModal from '../components/SecretRevealModal';
import SystemDetailModal from '../components/SystemDetailModal';
import { systemsApi, getErrorMessage } from '../services/api';

function emptyForm() {
  return { name: '', slug: '', redirectUris: [''] };
}

export default function Sistemas() {
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [createError, setCreateError] = useState(null);
  const [creating, setCreating] = useState(false);

  const [reveal, setReveal] = useState(null);
  const [detailSystem, setDetailSystem] = useState(null);

  const fetchSystems = () => {
    setLoading(true);
    setError(null);
    systemsApi
      .list()
      .then((res) => setSystems(res.data))
      .catch((err) => setError(getErrorMessage(err, 'Erro ao buscar sistemas')))
      .finally(() => setLoading(false));
  };

  useEffect(fetchSystems, []);

  const updateUri = (index, value) => {
    setForm((f) => ({
      ...f,
      redirectUris: f.redirectUris.map((uri, i) => (i === index ? value : uri)),
    }));
  };

  const addUriField = () => setForm((f) => ({ ...f, redirectUris: [...f.redirectUris, ''] }));
  const removeUriField = (index) =>
    setForm((f) => ({ ...f, redirectUris: f.redirectUris.filter((_, i) => i !== index) }));

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const payload = { ...form, redirectUris: form.redirectUris.map((u) => u.trim()).filter(Boolean) };
      const res = await systemsApi.create(payload);
      setCreateOpen(false);
      setForm(emptyForm());
      fetchSystems();
      setReveal({
        title: 'Sistema criado',
        label: `client_secret de ${res.data.slug}`,
        value: res.data.clientSecret,
      });
    } catch (err) {
      setCreateError(getErrorMessage(err, 'Erro ao criar sistema'));
    } finally {
      setCreating(false);
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
          <div className="stat-icon purple"><i className="fas fa-server"></i></div>
          <div className="stat-info">
            <div className="stat-label">Sistemas Cadastrados</div>
            <div className="stat-value">{systems.length}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Sistemas</h3>
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <i className="fas fa-plus"></i> Novo sistema
          </button>
        </div>
        <div className="card-body">
          {loading ? (
            <div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 42, marginBottom: 8, borderRadius: 6 }}></div>
              ))}
            </div>
          ) : systems.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-server"></i>
              <h4>Nenhum sistema cadastrado</h4>
              <p>Cadastre o primeiro sistema cliente pelo botão acima.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Slug</th>
                    <th>Client ID</th>
                    <th>Redirect URIs</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {systems.map((system) => (
                    <tr key={system.id}>
                      <td style={{ fontWeight: 500 }}>{system.name}</td>
                      <td><code>{system.slug}</code></td>
                      <td><code style={{ fontSize: '0.78rem' }}>{system.clientId}</code></td>
                      <td>{system.redirectUris.length}</td>
                      <td>
                        <span className={`badge ${system.active ? 'success' : 'neutral'}`}>
                          {system.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => setDetailSystem(system)}>
                          <i className="fas fa-gear"></i> Gerenciar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
          <div className="card" style={{ maxWidth: 520, width: '100%' }}>
            <div className="card-body">
              <h3 style={{ marginBottom: '1rem' }}>Novo sistema</h3>
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
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Farol"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Slug</label>
                  <input
                    className="form-input"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="farol"
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    title="Letras minúsculas, números e hifens"
                    required
                  />
                  <small style={{ color: 'var(--text-muted)' }}>
                    Usado nas claims do token - curto, estável, sem espaços.
                  </small>
                </div>
                <div className="form-group">
                  <label className="form-label">Redirect URIs</label>
                  {form.redirectUris.map((uri, index) => (
                    <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        className="form-input"
                        value={uri}
                        onChange={(e) => updateUri(index, e.target.value)}
                        placeholder="http://localhost:5174/callback"
                        required
                      />
                      {form.redirectUris.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => removeUriField(index)}
                          aria-label="Remover"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addUriField}>
                    <i className="fas fa-plus"></i> Adicionar URI
                  </button>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '1rem 0' }}>
                  client_id e client_secret são gerados automaticamente. O secret é exibido uma única vez.
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
                      <><i className="fas fa-plus"></i> Criar</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {detailSystem && (
        <SystemDetailModal
          system={detailSystem}
          onClose={() => setDetailSystem(null)}
          onUpdated={() => {
            fetchSystems();
          }}
          onSecretRegenerated={(clientSecret) =>
            setReveal({ title: 'Secret regenerado', label: `Novo client_secret de ${detailSystem.slug}`, value: clientSecret })
          }
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
