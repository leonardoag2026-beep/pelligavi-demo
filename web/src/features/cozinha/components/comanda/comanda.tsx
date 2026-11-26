import { css } from '@emotion/css';
import { brl, desde } from '../../../../shared/utils/format';
import { canal, STATUS_PEDIDO } from '../../../../shared/config/canais';
import type { Pedido, StatusPedido } from '../../../../api/services/pedidos';

// composição no cartão: linhas curtas, mais discretas que o nome do item
const listaComposicao = css({
  listStyle: 'none',
  margin: '0.1rem 0 0',
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.05rem',
  fontSize: '0.7rem',
  lineHeight: 1.3,
  opacity: 0.72,
});

const PASSOS_ENTREGA = ['preparo', 'pronto', 'rota', 'entregue'];
const PASSOS_BALCAO = ['preparo', 'pronto', 'retirado'];

const ACAO: Record<string, string> = {
  preparo: 'Voltar para preparo',
  pronto: 'Marcar pronto',
  rota: 'Saiu para entrega',
  entregue: 'Marcar entregue',
  retirado: 'Marcar retirado',
};

export const passosDe = (pedido: Pick<Pedido, 'tipo'>): string[] =>
  pedido.tipo === 'entrega' ? PASSOS_ENTREGA : PASSOS_BALCAO;

interface CartaoProps {
  pedido: Pedido;
  ativo?: boolean;
  aoAbrir?: () => void;
  lateral?: React.ReactNode;
}

export const Comanda: React.FC<CartaoProps> = ({ pedido, ativo = false, aoAbrir, lateral = null }) => {
  const c = canal(pedido.canal);
  const visiveis = pedido.itens.slice(0, 4);
  const resto = pedido.itens.length - visiveis.length;

  return (
    <article
      className={['comanda', 'comanda--cartao', ativo ? 'comanda--ativo' : '', pedido.status === 'pronto' ? 'comanda--pronta' : '']
        .join(' ')
        .trim()}
      role="button"
      tabIndex={0}
      onClick={(evento) => {
        if ((evento.target as HTMLElement).closest('button')) return;
        aoAbrir?.();
      }}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
          evento.preventDefault();
          aoAbrir?.();
        }
      }}
    >
      <header className="comanda__topo">
        <div>
          <strong className="comanda__numero">{pedido.id}</strong>
          <span className="comanda__canal" style={{ ['--canal' as string]: c.cor }}>
            {c.nome}
          </span>
        </div>
        <span className="comanda__tempo">{desde(pedido.criadoEm)}</span>
      </header>

      <p className="comanda__cliente">{pedido.cliente.nome}</p>

      <ul className="comanda__itens">
        {visiveis.map((item, indice) => (
          <li key={`${pedido.id}-${indice}`}>
            <strong>
              {item.qtd}× {item.nome}
            </strong>
            {item.detalhe ? <span className="nota">{item.detalhe}</span> : null}
            {item.composicao?.length ? (
              <ul className={listaComposicao}>
                {item.composicao.slice(0, 3).map((linha) => (
                  <li key={linha}>{linha}</li>
                ))}
                {item.composicao.length > 3 ? <li>+ {item.composicao.length - 3} ingredientes</li> : null}
              </ul>
            ) : null}
          </li>
        ))}
        {resto > 0 && (
          <li>
            <span className="nota">
              + {resto} {resto === 1 ? 'item' : 'itens'}
            </span>
          </li>
        )}
      </ul>

      {pedido.observacao ? <p className="comanda__obs">obs: {pedido.observacao}</p> : null}

      <footer className="comanda__acoes">
        {lateral}
        <span className="comanda__total">{brl(pedido.total)}</span>
      </footer>
    </article>
  );
};

interface EtapasProps {
  pedido: Pedido;
  aoMudar: (status: string) => void;
  acao?: boolean;
}

export const BlocoEtapas: React.FC<EtapasProps> = ({ pedido, aoMudar, acao = false }) => {
  const morto = ['cancelado', 'reembolsado'].includes(pedido.status);
  const passos = passosDe(pedido);
  const atual = passos.indexOf(pedido.status);
  const lista = morto ? [...passos, pedido.status] : passos;

  return (
    <div className="status-pedido">
      <span className="campo-rotulo">{acao ? 'Marcar etapa' : 'Situação do pedido'}</span>
      <div className="status-pedido__passos">
        {lista.map((id) => {
          const ativo = pedido.status === id;
          const feito = !morto && atual > -1 && passos.indexOf(id) < atual;
          return (
            <button
              key={id}
              type="button"
              className={['status-pedido__passo', ativo ? 'status-pedido__passo--ativo' : '', feito ? 'status-pedido__passo--feito' : '']
                .join(' ')
                .trim()}
              disabled={morto || ativo}
              onClick={() => aoMudar(id)}
            >
              {acao ? ACAO[id] : STATUS_PEDIDO[id]?.nome ?? id}
            </button>
          );
        })}
      </div>
      {morto && (
        <p className="nota">Pedido {STATUS_PEDIDO[pedido.status]?.nome.toLowerCase()}.</p>
      )}
      {!morto && (
        <button
          type="button"
          className="botao botao--perigo botao--mini"
          style={{ marginTop: '0.5rem', alignSelf: 'flex-start', width: 'auto' }}
          onClick={() => {
            const confirmar = window.confirm(`Cancelar o pedido ${pedido.id}?\n\nEle sai da cozinha e o histórico registra o cancelamento.`);
            if (confirmar) aoMudar('cancelado');
          }}
        >
          Cancelar pedido
        </button>
      )}
    </div>
  );
};

export type { StatusPedido };
