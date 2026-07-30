// src/pages/Acessos.jsx
// "Fluxo: selecionar usuario -> selecionar sistema -> selecionar papel ->
// conceder" (OS 06, 3.4). A listagem de acessos ativos e por usuario, por
// isso a pagina inteira gira em torno de um usuario selecionado.
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import { usersApi, systemsApi, accessApi, getErrorMessage } from '../services/api';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function AccessRow({ access, systemRoles, onChangeRole, onRevoke, busy }) {
  const [selectedRoleId, setSelectedRoleId] = useState(access.roleId);
  const roles = systemRoles[access.systemId] || [];
  const changed = selectedRoleId !== access.roleId;

  return (
    <tr>
      <td style={{ fontWeight: 500 }}>{access.systemName}</td>
      <td>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <select
            className="form-input"
            style={{ minHeight: 36, padding: '0.35rem 0.6rem' }}
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            disabled={busy}
          >
            {roles.length === 0 && <option value={access.roleId}>{access.roleName}</option>}
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          {changed && (
            <button
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={() => onChangeRole(access, selectedRoleId)}
            >
              <i className="fas fa-check"></i>
            </button>
          )}
        </div>
      </td>
      <td>{dateFormatter.format(new Date(access.grantedAt))}</td>
      <td>
        <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => onRevoke(access)}>
          <i className="fas fa-ban"></i> Revogar
        </button>
      </td>
    </tr>
  );
}

export default function Acessos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedUserId = searchParams.get('userId') || '';

  const [users, setUsers] = useState([]);
  const [systems, setSystems] = useState([]);
  const [error, setError] = useState(null);

  const [selectedUserId, setSelectedUserId] = useState(preselectedUserId);
  const [accesses, setAccesses] = useState([]);
  const [accessesLoading, setAccessesLoading] = useState(false);

  const [systemRoles, setSystemRoles] = useState({}); // systemId -> Role[]

  const [grantSystemId, setGrantSystemId] = useState('');
  const [grantRoleId, setGrantRoleId] = useState('');
  const [granting, setGranting] = useState(false);

  const [busyAccessId, setBusyAccessId] = useState(null);
  const [confirmRevoke, setConfirmRevoke] = useState(null);

  useEffect(() => {
    Promise.all([usersApi.list({ limit: 100 }), systemsApi.list()])
      .then(([usersRes, systemsRes]) => {
        setUsers(usersRes.data.data);
        setSystems(systemsRes.data);
      })
      .catch((err) => setError(getErrorMessage(err, 'Erro ao carregar dados')));
  }, []);

  const fetchAccesses = (userId) => {
    if (!userId) {
      setAccesses([]);
      return;
    }
    setAccessesLoading(true);
    usersApi
      .listAccess(userId)
      .then((res) => setAccesses(res.data))
      .catch((err) => setError(getErrorMessage(err, 'Erro ao buscar acessos do usuário')))
      .finally(() => setAccessesLoading(false));
  };

  useEffect(() => {
    fetchAccesses(selectedUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  const ensureRolesLoaded = (systemId) => {
    if (!systemId || systemRoles[systemId]) return;
    systemsApi
      .listRoles(systemId)
      .then((res) => setSystemRoles((prev) => ({ ...prev, [systemId]: res.data })))
      .catch((err) => setError(getErrorMessage(err, 'Erro ao buscar papéis do sistema')));
  };

  useEffect(() => {
    accesses.forEach((access) => ensureRolesLoaded(access.systemId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accesses]);

  useEffect(() => {
    ensureRolesLoaded(grantSystemId);
    setGrantRoleId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grantSystemId]);

  const handleUserChange = (userId) => {
    setSelectedUserId(userId);
    setSearchParams(userId ? { userId } : {});
  };

  const selectedUser = useMemo(() => users.find((u) => u.id === selectedUserId), [users, selectedUserId]);

  const handleGrant = async (e) => {
    e.preventDefault();
    setGranting(true);
    setError(null);
    try {
      await accessApi.grant({ userId: selectedUserId, systemId: grantSystemId, roleId: grantRoleId });
      setGrantSystemId('');
      setGrantRoleId('');
      fetchAccesses(selectedUserId);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao conceder acesso'));
    } finally {
      setGranting(false);
    }
  };

  const handleChangeRole = async (access, newRoleId) => {
    setBusyAccessId(access.id);
    setError(null);
    try {
      await accessApi.changeRole(access.id, newRoleId);
      fetchAccesses(selectedUserId);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao trocar papel'));
    } finally {
      setBusyAccessId(null);
    }
  };

  const handleRevoke = async (access) => {
    setBusyAccessId(access.id);
    setError(null);
    try {
      await accessApi.revoke(access.id);
      setConfirmRevoke(null);
      fetchAccesses(selectedUserId);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao revogar acesso'));
    } finally {
      setBusyAccessId(null);
    }
  };

  const systemsWithoutAccess = systems.filter((s) => !accesses.some((a) => a.systemId === s.id));

  return (
    <>
      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <h3>Selecionar usuário</h3>
        </div>
        <div className="card-body">
          <select
            className="form-input"
            value={selectedUserId}
            onChange={(e) => handleUserChange(e.target.value)}
          >
            <option value="">Selecione um usuário...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedUserId && (
        <>
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-header">
              <h3>Acessos ativos {selectedUser ? `de ${selectedUser.name}` : ''}</h3>
            </div>
            <div className="card-body">
              {accessesLoading ? (
                <div className="skeleton" style={{ height: 60, borderRadius: 6 }}></div>
              ) : accesses.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-key"></i>
                  <h4>Nenhum acesso concedido</h4>
                  <p>Use o formulário abaixo para conceder acesso a um sistema.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Sistema</th>
                        <th>Papel</th>
                        <th>Concedido em</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accesses.map((access) => (
                        <AccessRow
                          key={access.id}
                          access={access}
                          systemRoles={systemRoles}
                          busy={busyAccessId === access.id}
                          onChangeRole={handleChangeRole}
                          onRevoke={(a) => setConfirmRevoke(a)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Conceder novo acesso</h3>
            </div>
            <div className="card-body">
              {systemsWithoutAccess.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>
                  Este usuário já tem acesso ativo a todos os sistemas cadastrados.
                </p>
              ) : (
                <form onSubmit={handleGrant} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                    <label className="form-label">Sistema</label>
                    <select
                      className="form-input"
                      value={grantSystemId}
                      onChange={(e) => setGrantSystemId(e.target.value)}
                      required
                    >
                      <option value="">Selecione...</option>
                      {systemsWithoutAccess.map((system) => (
                        <option key={system.id} value={system.id}>
                          {system.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                    <label className="form-label">Papel</label>
                    <select
                      className="form-input"
                      value={grantRoleId}
                      onChange={(e) => setGrantRoleId(e.target.value)}
                      required
                      disabled={!grantSystemId}
                    >
                      <option value="">Selecione...</option>
                      {(systemRoles[grantSystemId] || []).map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="btn btn-primary" type="submit" disabled={granting || !grantRoleId}>
                    {granting ? (
                      <><i className="fas fa-spinner fa-spin"></i> Concedendo...</>
                    ) : (
                      <><i className="fas fa-plus"></i> Conceder</>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </>
      )}

      {confirmRevoke && (
        <ConfirmModal
          title="Revogar acesso"
          message={`Revogar o acesso de "${selectedUser?.name}" a "${confirmRevoke.systemName}"? O usuário perde o acesso imediatamente para novos logins nesse sistema (um token já emitido e ainda válido continua funcionando até expirar naturalmente).`}
          confirmLabel="Revogar"
          loading={busyAccessId === confirmRevoke.id}
          onConfirm={() => handleRevoke(confirmRevoke)}
          onCancel={() => setConfirmRevoke(null)}
        />
      )}
    </>
  );
}
