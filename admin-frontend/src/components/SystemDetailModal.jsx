// src/components/SystemDetailModal.jsx
import { useEffect, useState } from 'react';
import ConfirmModal from './ConfirmModal';
import { systemsApi, rolesApi, getErrorMessage } from '../services/api';

export default function SystemDetailModal({ system, onClose, onUpdated, onSecretRegenerated }) {
  const [name, setName] = useState(system.name);
  const [active, setActive] = useState(system.active);
  const [redirectUris, setRedirectUris] = useState(system.redirectUris.length ? system.redirectUris : ['']);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [creatingRole, setCreatingRole] = useState(false);
  const [confirmDeleteRole, setConfirmDeleteRole] = useState(null);
  const [deletingRoleId, setDeletingRoleId] = useState(null);

  const fetchRoles = () => {
    setRolesLoading(true);
    setRolesError(null);
    systemsApi
      .listRoles(system.id)
      .then((res) => setRoles(res.data))
      .catch((err) => setRolesError(getErrorMessage(err, 'Erro ao buscar papéis')))
      .finally(() => setRolesLoading(false));
  };

  useEffect(fetchRoles, [system.id]);

  const updateUri = (index, value) =>
    setRedirectUris((uris) => uris.map((uri, i) => (i === index ? value : uri)));
  const addUriField = () => setRedirectUris((uris) => [...uris, '']);
  const removeUriField = (index) => setRedirectUris((uris) => uris.filter((_, i) => i !== index));

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await systemsApi.update(system.id, {
        name,
        active,
        redirectUris: redirectUris.map((u) => u.trim()).filter(Boolean),
      });
      setSaveSuccess(true);
      onUpdated();
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Erro ao salvar sistema'));
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await systemsApi.regenerateSecret(system.id);
      setConfirmRegenerate(false);
      onSecretRegenerated(res.data.clientSecret);
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Erro ao regenerar secret'));
    } finally {
      setRegenerating(false);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    setCreatingRole(true);
    setRolesError(null);
    try {
      await systemsApi.createRole(system.id, roleForm);
      setRoleForm({ name: '', description: '' });
      fetchRoles();
    } catch (err) {
      setRolesError(getErrorMessage(err, 'Erro ao criar papel'));
    } finally {
      setCreatingRole(false);
    }
  };

  const handleDeleteRole = async (role) => {
    setDeletingRoleId(role.id);
    setRolesError(null);
    try {
      await rolesApi.remove(role.id);
      setConfirmDeleteRole(null);
      fetchRoles();
    } catch (err) {
      setRolesError(getErrorMessage(err, 'Erro ao remover papel'));
    } finally {
      setDeletingRoleId(null);
    }
  };

  return (
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
        overflowY: 'auto',
      }}
    >
      <div className="card" style={{ maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="card-header">
          <h3>{system.name}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fechar">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="card-body">
          {saveError && (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-circle"></i> {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="alert alert-success">
              <i className="fas fa-check-circle"></i> Alterações salvas.
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nome</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Slug</label>
            <input className="form-input" value={system.slug} disabled />
          </div>

          <div className="form-group">
            <label className="form-label">Client ID</label>
            <input className="form-input" value={system.clientId} disabled style={{ fontFamily: 'monospace' }} />
          </div>

          <div className="form-group">
            <label className="form-label">Redirect URIs</label>
            {redirectUris.map((uri, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input className="form-input" value={uri} onChange={(e) => updateUri(index, e.target.value)} />
                {redirectUris.length > 1 && (
                  <button type="button" className="btn btn-ghost" onClick={() => removeUriField(index)}>
                    <i className="fas fa-trash"></i>
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={addUriField}>
              <i className="fas fa-plus"></i> Adicionar URI
            </button>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <input
              type="checkbox"
              id="system-active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <label htmlFor="system-active" className="form-label" style={{ margin: 0 }}>
              Sistema ativo
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                <><i className="fas fa-spinner fa-spin"></i> Salvando...</>
              ) : (
                <><i className="fas fa-save"></i> Salvar alterações</>
              )}
            </button>
            <button className="btn btn-secondary" onClick={() => setConfirmRegenerate(true)} disabled={regenerating}>
              <i className="fas fa-rotate"></i> Regenerar client_secret
            </button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />

          <h4 style={{ marginBottom: '0.75rem' }}>Papéis de {system.name}</h4>

          {rolesError && (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-circle"></i> {rolesError}
            </div>
          )}

          {rolesLoading ? (
            <div className="skeleton" style={{ height: 80, borderRadius: 6 }}></div>
          ) : roles.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Nenhum papel cadastrado ainda.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              {roles.map((role) => (
                <span key={role.id} className="badge neutral" style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}>
                  {role.name}
                  {role.description ? ` — ${role.description}` : ''}
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteRole(role)}
                    disabled={deletingRoleId === role.id}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--danger)',
                      cursor: 'pointer',
                      marginLeft: '0.5rem',
                      padding: 0,
                    }}
                    aria-label={`Remover papel ${role.name}`}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </span>
              ))}
            </div>
          )}

          <form onSubmit={handleCreateRole} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              className="form-input"
              style={{ flex: '1 1 140px' }}
              placeholder="Nome do papel (ex.: gerente)"
              value={roleForm.name}
              onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              className="form-input"
              style={{ flex: '2 1 200px' }}
              placeholder="Descrição (opcional)"
              value={roleForm.description}
              onChange={(e) => setRoleForm((f) => ({ ...f, description: e.target.value }))}
            />
            <button className="btn btn-secondary" type="submit" disabled={creatingRole}>
              {creatingRole ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus"></i>}
            </button>
          </form>
        </div>
      </div>

      {confirmRegenerate && (
        <ConfirmModal
          title="Regenerar client_secret"
          message={`O client_secret atual de "${system.name}" deixará de funcionar imediatamente. Sistemas que ainda usam o secret antigo vão parar de conseguir trocar code por token até serem atualizados. Deseja continuar?`}
          confirmLabel="Regenerar"
          loading={regenerating}
          onConfirm={handleRegenerate}
          onCancel={() => setConfirmRegenerate(false)}
        />
      )}

      {confirmDeleteRole && (
        <ConfirmModal
          title="Remover papel"
          message={`Remover o papel "${confirmDeleteRole.name}"? Isso só é possível se nenhum acesso (ativo ou histórico) usar esse papel.`}
          confirmLabel="Remover"
          loading={deletingRoleId === confirmDeleteRole.id}
          onConfirm={() => handleDeleteRole(confirmDeleteRole)}
          onCancel={() => setConfirmDeleteRole(null)}
        />
      )}
    </div>
  );
}
