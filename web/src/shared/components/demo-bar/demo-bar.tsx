import { Link, useLocation } from 'react-router-dom';

interface DemoBarProps {
  pedidos?: number;
}

export const DemoBar: React.FC<DemoBarProps> = ({ pedidos = 0 }) => {
  const { pathname } = useLocation();
  const noPainel = pathname.startsWith('/painel');

  return (
    <div className="abas-topo">
      <div className="abas-topo__marca">
        <span className="abas-topo__logo">Pelligavi</span>
        <span className="abas-topo__demo">demo</span>
      </div>
      <div className="abas-topo__botoes">
        <Link to="/" className={['abas-topo__botao', !noPainel ? 'abas-topo__botao--ativo' : ''].join(' ').trim()}>
          Loja
        </Link>
        <Link to="/painel" className={['abas-topo__botao', noPainel ? 'abas-topo__botao--ativo' : ''].join(' ').trim()}>
          Painel
          {pedidos > 0 && <span className="abas-topo__contador">{pedidos}</span>}
        </Link>
      </div>
    </div>
  );
};
