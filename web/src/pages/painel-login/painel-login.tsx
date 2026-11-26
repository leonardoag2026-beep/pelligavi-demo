import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/auth-context';
import { Marca } from '../../shared/ui/marca/marca';
import { DemoBar } from '../../shared/components/demo-bar/demo-bar';
import { css } from '@emotion/css';

// caixa de credenciais de demo logo abaixo do cartão de login
const demoCss = css({
  marginTop: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  alignItems: 'center',
  padding: '12px 16px',
  border: '1px dashed rgba(244, 241, 234, 0.22)',
  borderRadius: 14,
  color: 'rgba(244, 241, 234, 0.82)',
  fontSize: '0.82rem',
  '& b': { color: 'rgba(244, 241, 234, 0.5)', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.66rem', letterSpacing: '0.1em', marginRight: 8 },
});

const PainelLogin: React.FC = () => {
  const { gerente, entrar } = useAuth();
  const navegar = useNavigate();
  const [email, setEmail] = useState('gerente@pelligavi.com');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (gerente) return <Navigate to="/painel" replace />;

  const submeter = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
      navegar('/painel');
    } catch {
      setErro('E-mail ou senha inválidos.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <DemoBar />
      <div className="login">
        <form className="login__cartao" onSubmit={submeter}>
          <div className="login__marca">
            <Marca compacta nome="Pelligavi" />
          </div>

          <div className="campo-grupo">
            <span className="entrada__rotulo">E-mail do gerente</span>
            <input className="entrada__campo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </div>

          <div className="campo-grupo">
            <span className="entrada__rotulo">Senha</span>
            <input className="entrada__campo" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
          </div>

          {erro && <span className="campo-erro">{erro}</span>}

          <button type="submit" className="botao botao--primario botao--grande" disabled={enviando || !senha}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="login__dica nota">Acesso do gerente. A sessão fica no servidor.</p>
        </form>

        {/* demo: credenciais à vista, é projeto de demonstração */}
        <div className={demoCss}>
          <span style={{ fontSize: '0.66rem', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.5 }}>acesso de demonstração</span>
          <span style={{ display: 'flex', gap: 6 }}><b>e-mail</b> gerente@pelligavi.com</span>
          <span style={{ display: 'flex', gap: 6 }}><b>senha</b> pizzaria2026</span>
          <button
            type="button"
            className="botao botao--vidro botao--mini"
            onClick={() => {
              setEmail('gerente@pelligavi.com');
              setSenha('pizzaria2026');
            }}
          >
            Preencher
          </button>
        </div>
      </div>
    </>
  );
};

export default PainelLogin;
