import { css } from '@emotion/css';
import { brl, desde } from '../../../../shared/utils/format';
import type { Pedido } from '../../../../api/services/pedidos';

interface ComandaCardProps {
  pedido: Pedido;
  ativo?: boolean;
  aoAbrir: () => void;
}

const cartao = css({
  display: 'grid',
  gap: '0.45rem',
  padding: '0.85rem 0.9rem',
  borderRadius: 14,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'border-color 140ms ease, transform 120ms ease',
  ':hover': { borderColor: 'var(--line-2)', transform: 'translateY(-1px)' },
});

const ativoCss = css({ borderColor: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)' });
const prontoCss = css({ borderColor: 'rgba(28, 138, 78, 0.55)' });

const topo = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' });

const numero = css({ fontFamily: 'var(--display)', fontSize: '1.02rem' });

const canal = css({
  fontSize: '0.62rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
});

const tempo = css({ fontSize: '0.72rem', color: 'var(--ink-3)' });
const cliente = css({ fontSize: '0.86rem', color: 'var(--ink)' });

const itens = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  gap: '0.1rem',
  fontSize: '0.78rem',
  color: 'var(--ink-2)',
});

const rodape = css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' });

export const ComandaCard: React.FC<ComandaCardProps> = ({ pedido, ativo = false, aoAbrir }) => {
  const visiveis = pedido.itens.slice(0, 4);
  const resto = pedido.itens.length - visiveis.length;

  return (
    <article
      className={[cartao, ativo ? ativoCss : '', pedido.status === 'pronto' ? prontoCss : ''].join(' ')}
      role="button"
      tabIndex={0}
      onClick={aoAbrir}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
          evento.preventDefault();
          aoAbrir();
        }
      }}
    >
      <header className={topo}>
        <span style={{ display: 'grid', gap: 2 }}>
          <strong className={numero}>{pedido.id}</strong>
          <span className={canal}>{pedido.canal}</span>
        </span>
        <span className={tempo}>{desde(pedido.criadoEm)}</span>
      </header>

      <span className={cliente}>{pedido.cliente.nome}</span>

      <ul className={itens}>
        {visiveis.map((item, indice) => (
          <li key={`${pedido.id}-${indice}`}>
            {item.qtd}× {item.nome}
            {item.detalhe ? ` · ${item.detalhe}` : ''}
          </li>
        ))}
        {resto > 0 && <li>+ {resto} item(ns)</li>}
      </ul>

      <div className={rodape}>
        <span className={tempo}>{pedido.tipo === 'entrega' ? 'entrega' : 'retirada'}</span>
        <strong>{brl(pedido.total)}</strong>
      </div>
    </article>
  );
};
