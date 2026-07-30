// src/components/SecretRevealModal.jsx
// Exibicao unica de um segredo (senha temporaria, client_secret) - nunca
// mostrado de novo depois de fechado, so o hash fica salvo no backend
// (OS 06, secao 5).
import { useState } from 'react';

export default function SecretRevealModal({ title, label, value, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
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
      }}
    >
      <div className="card" style={{ maxWidth: 480, width: '100%' }}>
        <div className="card-body">
          <h3 style={{ marginBottom: '0.6rem' }}>{title}</h3>
          <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
            <i className="fas fa-triangle-exclamation"></i>
            Esse valor só é exibido agora. Copie e guarde em local seguro - não será mostrado novamente.
          </div>

          <label className="form-label">{label}</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input className="form-input" readOnly value={value} style={{ fontFamily: 'monospace' }} />
            <button className="btn btn-secondary" type="button" onClick={handleCopy} style={{ flexShrink: 0 }}>
              <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i> {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button className="btn btn-primary" onClick={onClose}>
              Já copiei, fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
