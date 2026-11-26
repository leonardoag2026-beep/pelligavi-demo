import { TbArrowLeft } from 'react-icons/tb';
import { useEffect, useState } from 'react';
import { css } from '@emotion/css';
import { useNavigate } from 'react-router-dom';
import { useCheckout, calcularTotais } from '../../features/checkout/context/checkout-context';
import { StepPizza } from '../../features/checkout/components/step-pizza/step-pizza';
import { StepDados } from '../../features/checkout/components/step-dados/step-dados';
import { StepPagamento } from '../../features/checkout/components/step-pagamento/step-pagamento';
import { useGetConfig } from '../../features/config/hooks/config-api.hooks';
import { Button } from '../../shared/ui/button/button';
import { brl } from '../../shared/utils/format';
import { instalarCrm } from '../../shared/styles/crm';

const PASSOS = ['Pizza', 'Seus dados', 'Pagamento'];

const trilha = css({
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  fontSize: '0.76rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  opacity: 0.55,
});

const passoAtivo = css({ opacity: 1, color: 'var(--creme)' });

const barra = css({
  position: 'sticky',
  bottom: 0,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '1rem',
  padding: '0.9rem 0',
  background: 'linear-gradient(to top, var(--bg) 60%, transparent)',
});

const Conteudo: React.FC = () => {
  useEffect(() => {
    instalarCrm();
  }, []);

  const [passo, setPasso] = useState(0);
  const checkout = useCheckout();
  const { data: config } = useGetConfig();
  const navigate = useNavigate();
  const totais = calcularTotais(checkout, config);

  const podeAvancar = passo === 0 ? Boolean(checkout.sabor && checkout.tamanho) : true;

  return (
    <main className="etapa">
      <header>
        <span className="etapa__indice">pedido · passo {passo + 1} de {PASSOS.length}</span>
        <h1 className="etapa__titulo">Monte a sua pizza</h1>
        <div className={trilha}>
          {PASSOS.map((nome, indice) => (
            <span key={nome} className={indice === passo ? passoAtivo : ''}>
              {indice + 1}. {nome}
              {indice < PASSOS.length - 1 ? ' — ' : ''}
            </span>
          ))}
        </div>
      </header>

      <div className="etapa__grade">
        <section className="etapa__principal">
          {passo === 0 && <StepPizza />}
          {passo === 1 && <StepDados />}
          {passo === 2 && <StepPagamento />}
        </section>

        <aside className="etapa__apoio">
          <div className="pedido">
            <h2 className="pedido__titulo">Seu pedido</h2>
            <p className="pedido__prazo">{checkout.modo === 'entrega' ? (config ? `entrega · ${config.prazoEntregaMin} a ${config.prazoEntregaMax} min` : 'entrega') : 'retirada no balcão'}</p>

            <ul>
              <li className="pedido__linha">
                <span>Pizza {checkout.sabor ? checkout.sabor.nome : '—'}</span>
                <strong>{brl(totais.pizza)}</strong>
              </li>
              {totais.borda > 0 && (
                <li className="pedido__linha">
                  <span>Borda {checkout.borda?.nome}</span>
                  <strong>{brl(totais.borda)}</strong>
                </li>
              )}
              {totais.extras > 0 && (
                <li className="pedido__linha">
                  <span>Porções extras</span>
                  <strong>{brl(totais.extras)}</strong>
                </li>
              )}
              {totais.bebidas > 0 && (
                <li className="pedido__linha">
                  <span>Bebidas</span>
                  <strong>{brl(totais.bebidas)}</strong>
                </li>
              )}
              {totais.taxa > 0 && (
                <li className="pedido__linha">
                  <span>Entrega</span>
                  <strong>{brl(totais.taxa)}</strong>
                </li>
              )}
              {totais.desconto > 0 && (
                <li className="pedido__linha">
                  <span>Desconto</span>
                  <strong>-{brl(totais.desconto)}</strong>
                </li>
              )}
            </ul>

            <div className="pedido__linha pedido__linha--total">
              <span>Total</span>
              <strong>{brl(totais.total)}</strong>
            </div>
          </div>
        </aside>
      </div>

      <div className={barra}>
        <Button
          variante="ghost"
          onClick={() => (passo === 0 ? navigate('/') : setPasso(passo - 1))}
        >
          <TbArrowLeft aria-hidden /> {passo === 0 ? 'Loja' : 'Voltar'}
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Total {brl(totais.total)}</span>
          {passo < 2 && (
            <Button disabled={!podeAvancar} onClick={() => setPasso(passo + 1)}>
              Continuar
            </Button>
          )}
        </div>
      </div>
    </main>
  );
};

/** o provider vem do CheckoutLayout em routes.tsx */
const Pedido: React.FC = () => <Conteudo />;

export default Pedido;
