import { Marca } from '../../ui/marca/marca';
import { SITE } from '../../config/site';

export const Footer: React.FC = () => (
  <footer className="rodape">
    <div className="rodape__marca">
      <Marca />
      <p className="nota">
        {SITE.endereco} · {SITE.cidade}
      </p>
    </div>
    <div className="rodape__colunas">
      <div>
        <span className="nota">Horário</span>
        <p>Ter a dom · 18h às 23h30</p>
      </div>
      <div>
        <span className="nota">Contato</span>
        <p>{SITE.telefone}</p>
      </div>
      <div>
        <span className="nota">Entrega</span>
        <p>Vila Madalena, Pinheiros e Sumaré</p>
      </div>
    </div>
    <p className="nota nota--rodape">
      Demonstração: nada é cobrado de verdade e os pedidos ficam no banco da demonstração.
    </p>
  </footer>
);
