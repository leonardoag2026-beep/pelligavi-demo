import { useState } from 'react';
import { css } from '@emotion/css';
import { useAlterarStatus, useGetPedidos } from '../../../pedidos/hooks/pedidos-api.hooks';
import { Comanda, BlocoEtapas } from '../comanda/comanda';
import { brl, dataHora, desde, horaCurta } from '../../../../shared/utils/format';
import { canal, STATUS_PEDIDO } from '../../../../shared/config/canais';
import type { Pedido } from '../../../../api/services/pedidos';

// composição da pizza: uma linha por parte, discreta, embaixo do item
const composicao = css({
  listStyle: 'none',
  margin: '0.15rem 0 0',
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.1rem',
  gridColumn: '1 / -1',
  fontSize: '0.72rem',
  lineHeight: 1.35,
  color: 'var(--ink-3, #8b857c)',
});

// pedido novo entra como 'recebido' e tem que aparecer na cozinha na hora
const ABERTOS = ['recebido', 'preparo', 'pronto'];

export const PainelCozinha: React.FC = () => {
  const { data: pedidos, refetch, isFetching } = useGetPedidos();
  const alterar = useAlterarStatus();
  const [selecionado, setSelecionado] = useState<number | null>(null);

  const fila = (pedidos ?? [])
    .filter((p) => ABERTOS.includes(p.status))
    .sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime());

  const atual: Pedido | undefined = fila.find((p) => p.numero === selecionado);

  const marcar = (pedido: Pedido, status: string) => {
    alterar.mutate({ numero: pedido.numero, body: { status: status as never } });
  };

  return (
    <>
      <div className="cozinha-topo">
        <span className="nota">ordem de chegada · toque no cartão para abrir a ficha</span>
        <button
          type="button"
          className="botao botao--fantasma botao--mini"
          disabled={isFetching}
          onClick={() => {
            setSelecionado(null);
            void refetch();
          }}
        >
          {isFetching ? 'Atualizando…' : 'Atualizar agora'}
        </button>
      </div>

      <div className="cozinha__quadro">
        <div className="cozinha">
          {fila.length === 0 && <p className="cozinha__vazio">Nenhum pedido na fila. A cozinha está em dia.</p>}
          {fila.map((pedido) => (
            <Comanda
              key={pedido.id}
              pedido={pedido}
              ativo={pedido.numero === selecionado}
              aoAbrir={() => setSelecionado(pedido.numero)}
              lateral={
                pedido.status === 'pronto' ? (
                  <button type="button" className="botao botao--grande botao--discreto" disabled>
                    ✓ Pronto
                  </button>
                ) : (
                  <button
                    type="button"
                    className="botao botao--grande botao--primario"
                    onClick={() => marcar(pedido, pedido.status === 'recebido' ? 'preparo' : 'pronto')}
                  >
                    {pedido.status === 'recebido' ? 'Iniciar preparo' : 'Marcar pronto'}
                  </button>
                )
              }
            />
          ))}
        </div>

        <aside className="cozinha__detalhe" hidden={!selecionado}>
          {atual && (
            <article className="pedido-detalhe cozinha__ficha">
              <header className="pedido-detalhe__topo">
                <div>
                  <span className="canal-selo" style={{ ['--canal' as string]: canal(atual.canal).cor }}>
                    {canal(atual.canal).nome}
                  </span>
                  <h2>{atual.id}</h2>
                  <span className="nota">
                    {horaCurta(atual.criadoEm)} · {desde(atual.criadoEm)} · {atual.tipo}
                  </span>
                </div>
                <div className="cozinha__ficha-dir">
                  <strong className="pedido-detalhe__total">{brl(atual.total)}</strong>
                  <button type="button" className="icone-botao" aria-label="Fechar detalhe" onClick={() => setSelecionado(null)}>
                    ✕
                  </button>
                </div>
              </header>

              <BlocoEtapas pedido={atual} acao aoMudar={(status) => marcar(atual, status)} />

              <dl className="pedido-detalhe__dados">
                <dt>Cliente</dt>
                <dd>{atual.cliente.nome}</dd>
                <dt>Telefone</dt>
                <dd>{atual.cliente.telefone || '—'}</dd>
                <dt>{atual.tipo === 'entrega' ? 'Entrega' : 'Retirada'}</dt>
                <dd>{atual.tipo === 'entrega' ? atual.endereco || '—' : 'no balcão'}</dd>
                {atual.observacao ? <dt>Observação</dt> : null}
                {atual.observacao ? <dd className="cozinha__obs">{atual.observacao}</dd> : null}
              </dl>

              <ul className="pedido-detalhe__itens">
                {atual.itens.map((item, indice) => (
                  <li key={`${atual.id}-${indice}`}>
                    <span>
                      {item.qtd}× {item.nome}
                    </span>
                    <span className="nota">{item.detalhe || ''}</span>
                    <strong>{brl(item.preco * item.qtd)}</strong>
                    {item.composicao?.length ? (
                      <ul className={composicao}>
                        {item.composicao.map((linha) => (
                          <li key={linha}>{linha}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>

              <span className="nota">
                {STATUS_PEDIDO[atual.status]?.nome ?? atual.status} · aberto em {dataHora(atual.criadoEm)}
              </span>
            </article>
          )}
        </aside>
      </div>
    </>
  );
};
