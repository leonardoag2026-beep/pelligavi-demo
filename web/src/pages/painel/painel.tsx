import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Marca } from '../../shared/ui/marca/marca';
import { instalarCrm } from '../../shared/styles/crm';
import { useAuth } from '../../features/auth/context/auth-context';
import { useGetPedidos } from '../../features/pedidos/hooks/pedidos-api.hooks';
import { useGetConversas } from '../../features/crm/hooks/crm-api.hooks';
import type { IconType } from 'react-icons';
import {
  TbArrowsExchange,
  TbBell,
  TbBook2,
  TbCash,
  TbChartBar,
  TbChefHat,
  TbDots,
  TbHistory,
  TbLayoutDashboard,
  TbLogout,
  TbMessageCircle,
  TbSettings,
  TbUsers,
  TbUserStar,
  TbWallet,
} from 'react-icons/tb';

interface Aba {
  para: string;
  nome: string;
  Icone: IconType;
  subtitulo: string;
  fim?: boolean;
}

const ABAS: Aba[] = [
  { para: '/painel', nome: 'Geral', Icone: TbLayoutDashboard, subtitulo: 'resumo do dia', fim: true },
  { para: '/painel/cozinha', nome: 'Cozinha', Icone: TbChefHat, subtitulo: 'fila de produção, ordem de chegada' },
  { para: '/painel/conversas', nome: 'Conversas', Icone: TbMessageCircle, subtitulo: 'atendimento por canal' },
  { para: '/painel/analise', nome: 'Análise', Icone: TbChartBar, subtitulo: 'receitas, despesas e metas' },
  { para: '/painel/transacoes', nome: 'Transações', Icone: TbArrowsExchange, subtitulo: 'receitas, despesas e cobranças' },
  { para: '/painel/historico', nome: 'Histórico de pedidos', Icone: TbHistory, subtitulo: 'todos os pedidos, com filtros' },
  { para: '/painel/cardapio', nome: 'Cardápio', Icone: TbBook2, subtitulo: 'sabores, bebidas e adicionais' },
  { para: '/painel/clientes', nome: 'Clientes', Icone: TbUsers, subtitulo: 'cadastro e anonimização (LGPD)' },
  { para: '/painel/funcionarios', nome: 'Funcionários', Icone: TbUserStar, subtitulo: 'equipe, turnos e salários' },
  { para: '/painel/custos', nome: 'Custos', Icone: TbWallet, subtitulo: 'contas mensais, imediatas e periódicas' },
  { para: '/painel/notificacoes', nome: 'Notificações', Icone: TbBell, subtitulo: 'o que aconteceu no painel' },
  { para: '/painel/config', nome: 'Configurações', Icone: TbSettings, subtitulo: 'taxa, descontos e gerente' },
  { para: '/painel/caixa', nome: 'Caixa', Icone: TbCash, subtitulo: 'fundo de troco, movimento e fechamento' },
];

const PRIMARIAS = 4;

const Painel: React.FC = () => {
  const { sair } = useAuth();
  const { pathname } = useLocation();
  const navegar = useNavigate();
  const { data: pedidos } = useGetPedidos();
  const { data: conversas } = useGetConversas();
  const [folha, setFolha] = useState(false);

  useEffect(() => {
    instalarCrm();
  }, []);

  const atual = ABAS.find((aba) => (aba.fim ? pathname === aba.para : pathname.startsWith(aba.para))) ?? ABAS[0];
  // o servidor promove 'aberta' para 'em_atendimento' na primeira resposta:
  // contar só 'aberta' zerava o badge com o atendimento em andamento
  const abertas = (conversas ?? []).filter((c) => c.status !== 'resolvida').length;
  const naFila = (pedidos ?? []).filter((p) => p.status === 'preparo').length;
  const emAndamento = (pedidos ?? []).filter((p) => ['recebido', 'preparo', 'pronto', 'rota'].includes(p.status)).length;
  const contadorDe = (aba: Aba) => (aba.para === '/painel/conversas' ? abertas : aba.para === '/painel/cozinha' ? naFila : 0);

  const encerrar = () => {
    void sair();
  };

  const item = (aba: Aba, extra = '') => (
    <NavLink
      key={aba.para}
      to={aba.para}
      end={aba.fim}
      className={({ isActive }) => ['painel__item', extra, isActive ? 'painel__item--ativo' : ''].join(' ').trim()}
    >
      <span className="painel__item-icone"><aba.Icone /></span>
      <span className="painel__item-nome">{aba.nome}</span>
      {contadorDe(aba) > 0 && <span className="painel__contador">{contadorDe(aba)}</span>}
    </NavLink>
  );

  return (
    <>
    <div className="abas-topo">
      <div className="abas-topo__marca">
        <span className="abas-topo__logo">Pelligavi</span>
        <span className="abas-topo__demo">demo</span>
      </div>
      <div className="abas-topo__botoes">
        <Link to="/" className="abas-topo__botao">
          Loja
        </Link>
        <Link to="/painel" className="abas-topo__botao abas-topo__botao--ativo">
          <span>Painel</span>
          {emAndamento > 0 && <span className="abas-topo__contador">{emAndamento}</span>}
        </Link>
      </div>
    </div>
    <div className="painel">
      <aside className="painel__lateral">
        <div className="painel__marca">
          <Link to="/" aria-label="Pelligavi — loja">
            <Marca horizontal compacta nome="Pelligavi" />
          </Link>
        </div>

        <nav className="painel__nav">
          {ABAS.filter((aba) => aba.para !== '/painel/caixa').map((aba, indice) =>
            item(aba, indice < PRIMARIAS ? 'painel__item--primaria' : 'painel__item--extra')
          )}
          <button type="button" className="painel__item painel__item--mais" onClick={() => setFolha(true)}>
            <span className="painel__item-icone"><TbDots /></span>
            <span className="painel__item-nome">Mais</span>
          </button>
          <button type="button" className="painel__item painel__item--sair painel__sessao--on" onClick={encerrar}>
            <span className="painel__item-icone"><TbLogout /></span>
            <span className="painel__item-nome">Sair da conta</span>
          </button>
        </nav>
      </aside>

      <main className="painel__principal">
        <header className="painel__topo">
          <div className="painel__titulo">
            <h1>{atual.nome}</h1>
            <span className="nota painel__subtitulo">{atual.subtitulo}</span>
          </div>
          <div className="painel__topo-dir" />
        </header>
        <div className="painel__conteudo">
          <Outlet />
        </div>
      </main>

      {folha && (
      <div className="painel__mais painel__mais--aberto">
        <div className="painel__mais-topo">
          <span className="campo-rotulo">Mais telas</span>
          <button type="button" className="painel__mais-fechar" aria-label="Fechar mais telas" onClick={() => setFolha(false)}>
            ✕
          </button>
        </div>
        <div className="painel__mais-lista">
          {ABAS.slice(PRIMARIAS).map((aba) => (
            <button
              key={`folha-${aba.para}`}
              type="button"
              className={['painel__item', 'painel__item--folha', atual.para === aba.para ? 'painel__item--ativo' : ''].join(' ')}
              onClick={() => {
                setFolha(false);
                navegar(aba.para);
              }}
            >
              <span className="painel__item-icone"><aba.Icone /></span>
              <span className="painel__item-nome">{aba.nome}</span>
              {contadorDe(aba) > 0 && <span className="painel__contador">{contadorDe(aba)}</span>}
            </button>
          ))}
          <button
            type="button"
            className="painel__item painel__item--folha painel__item--deslogar"
            onClick={() => {
              setFolha(false);
              encerrar();
            }}
          >
            <span className="painel__item-icone"><TbLogout /></span>
            <span className="painel__item-nome">Sair da conta</span>
          </button>
        </div>
      </div>
      )}
    </div>
    </>
  );
};

export default Painel;
