import { Link } from 'react-router-dom';
import { Marca } from '../../ui/marca/marca';
import { SITE } from '../../config/site';

export const Navbar: React.FC = () => {
  return (
    <header className="topo">
      <div className="topo__marca">
        <Link to="/" aria-label="Pelligavi — início">
          <Marca horizontal nome={SITE.nome} />
        </Link>
        <span className="topo__selo">
          <span className="ponto-verde" />
          {SITE.aberto}
        </span>
      </div>
      <div className="topo__acoes">
        <div className="topo__conta">
          <Link to="/pedidos" className="botao botao--vidro botao--mini">
            Pedidos
          </Link>
          <Link to="/entrar" className="botao botao--vidro botao--mini">
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
};
