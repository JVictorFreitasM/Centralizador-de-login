// src/components/ConfirmModal.jsx
// Confirmação explícita antes de ações com efeito imediato (desativar
// usuário, revogar acesso) - OS 06, seção 5.
export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
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
      }}
    >
      <div className="card" style={{ maxWidth: 440, width: '100%' }}>
        <div className="card-body">
          <h3 style={{ marginBottom: '0.6rem' }}>{title}</h3>
          <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
              Cancelar
            </button>
            <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
              {loading ? (
                <><i className="fas fa-spinner fa-spin"></i> Processando...</>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
