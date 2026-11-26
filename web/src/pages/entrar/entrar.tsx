import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { css } from '@emotion/css';
import { instalarCrm } from '../../shared/styles/crm';

// o cartão fica no centro da tela no desktop: antes ele encostava à esquerda
const molduraCss = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 'calc(100vh - 240px)',
  padding: 'clamp(1rem, 4vw, 2.5rem)',
});
const cartaoCss = css({
  width: '100%',
  maxWidth: 420,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
});

type Etapa = 'destino' | 'codigo' | 'nome';

const Entrar: React.FC = () => {
  const navegar = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>('destino');
  const [destino, setDestino] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [aviso, setAviso] = useState('');
  const [canal, setCanal] = useState<'email' | 'sms'>('email');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    instalarCrm();
  }, []);

  const pedirCodigo = async () => {
    setErro('');
    setEnviando(true);
    try {
      const { data } = await api.post('/api/auth/cliente/codigo', { destino });
      setCanal(data.canal);
      // demo: não há provedor de e-mail/SMS; o código volta na resposta e fica à vista
      setAviso(data.codigo ? `modo demonstração — seu código é ${data.codigo}` : 'código enviado');
      setEtapa('codigo');
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? 'Não foi possível enviar o código.');
    } finally {
      setEnviando(false);
    }
  };

  const confirmar = async () => {
    setErro('');
    setEnviando(true);
    try {
      const { data } = await api.post('/api/auth/cliente/entrar', { destino, codigo });
      if (data.precisaCadastro) {
        setEtapa('nome');
        setAviso('primeira vez por aqui — como podemos te chamar?');
        return;
      }
      navegar('/pedidos');
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? 'Código incorreto.');
    } finally {
      setEnviando(false);
    }
  };

  const criar = async () => {
    setErro('');
    setEnviando(true);
    try {
      await api.post('/api/auth/cliente/registro', { nome, destino, codigo });
      navegar('/pedidos');
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? 'Não foi possível criar a conta.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="etapa entrar">
      <div className={molduraCss}>
        <section className={`etapa__bloco ${cartaoCss}`}>
          <header className="etapa__cabecalho">
            <span className="etapa__indice">conta do cliente</span>
            <h2 className="etapa__titulo">
              {etapa === 'nome' ? 'Criar conta' : etapa === 'codigo' ? 'Confirme o código' : 'Entrar'}
            </h2>
            <p className="etapa__apoio">
              {etapa === 'destino'
                ? 'Entre com o seu e-mail ou celular. Mandamos um código, sem senha.'
                : etapa === 'codigo'
                  ? `Enviamos um código de 6 dígitos por ${canal === 'email' ? 'e-mail' : 'SMS'} para ${destino}.`
                  : 'Só falta o seu nome para abrir a conta.'}
            </p>
          </header>

          {etapa === 'destino' && (
            <div className="campo-grupo">
              <span className="campo-rotulo">E-mail ou celular</span>
              <input
                className="campo"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Seu e-mail ou (11) 99999-0000"
                autoComplete="username"
                onKeyDown={(e) => e.key === 'Enter' && pedirCodigo()}
              />
            </div>
          )}

          {etapa === 'codigo' && (
            <div className="campo-grupo">
              <span className="campo-rotulo">Código de 6 dígitos</span>
              <input
                className="campo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="000000"
                autoComplete="one-time-code"
                onKeyDown={(e) => e.key === 'Enter' && confirmar()}
              />
            </div>
          )}

          {etapa === 'nome' && (
            <div className="campo-grupo">
              <span className="campo-rotulo">Seu nome</span>
              <input
                className="campo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
                onKeyDown={(e) => e.key === 'Enter' && criar()}
              />
            </div>
          )}

          {aviso && <p className="entrar__aviso">{aviso}</p>}
          {erro && <p className="entrar__erro">{erro}</p>}

          <button
            type="button"
            className="botao botao--primario botao--grande"
            disabled={enviando}
            onClick={etapa === 'destino' ? pedirCodigo : etapa === 'codigo' ? confirmar : criar}
          >
            {enviando ? 'aguarde…' : etapa === 'destino' ? 'Receber código' : etapa === 'codigo' ? 'Entrar' : 'Criar conta'}
          </button>

          {etapa !== 'destino' && (
            <button
              type="button"
              className="botao botao--vidro botao--mini"
              onClick={() => {
                setEtapa('destino');
                setCodigo('');
                setAviso('');
                setErro('');
              }}
            >
              Trocar e-mail ou celular
            </button>
          )}
        </section>
      </div>
    </main>
  );
};

export default Entrar;
