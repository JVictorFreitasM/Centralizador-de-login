// src/pages/Erro.jsx
// OS 17: tela de erro pro caso em que o /authorize falha ANTES de conhecer
// um redirect_uri valido (client_id ausente/desconhecido, redirect_uri fora
// da lista) - nao ha pra onde redirecionar de volta, entao o proprio IdP
// mostra o erro (diferente dos erros pos-redirect, tratados no sistema
// cliente - ver idp-client/src/middleware/callback.ts).
import { useSearchParams } from 'react-router-dom';
import AuthCard from '../components/AuthCard';

const DEFAULT_MESSAGE = 'Nao foi possivel iniciar o login. Verifique o link usado ou tente novamente.';

export default function Erro() {
  const [searchParams] = useSearchParams();
  const message = searchParams.get('message') || DEFAULT_MESSAGE;

  return (
    <AuthCard icon="fas fa-triangle-exclamation" title="Nao foi possivel entrar" subtitle="Erro ao iniciar o login">
      <div className="alert alert-danger">
        <i className="fas fa-exclamation-circle"></i> {message}
      </div>
      <a className="btn btn-primary" href="/login-ui" style={{ width: '100%', display: 'block', textAlign: 'center' }}>
        <i className="fas fa-right-to-bracket"></i> Voltar ao login
      </a>
    </AuthCard>
  );
}
