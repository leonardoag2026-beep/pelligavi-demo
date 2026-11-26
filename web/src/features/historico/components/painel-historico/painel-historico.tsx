import { useMemo, useState } from 'react';
import { useGetPedidos, useAlterarStatus } from '../../../pedidos/hooks/pedidos-api.hooks';
import { BlocoEtapas } from '../../../cozinha/components/comanda/comanda';
import { brl, dataHora, desde, horaCurta } from '../../../../shared/utils/format';
import { canal, STATUS_PEDIDO } from '../../../../shared/config/canais';
import type { Pedido } from '../../../../api/services/pedidos';

const FILTROS = [
  ['todos', 'Todos'],
  ['recebido', 'Recebido'],
  ['preparo', 'Em preparo'],
  ['pronto', 'Pronto'],
  ['rota', 'Em rota'],
  ['entregue', 'Entregue'],
  ['cancelado', 'Cancelado'],
] as const;

const PERIODOS = [
  ['hoje', 'Hoje'],
  ['7', '7 dias'],
  ['tudo', 'Tudo'],
] as const;

export const PainelHistorico: React.FC = () => {
  const { data: pedidos } = useGetPedidos();
  const alterar = useAlterarStatus();
  const [status, setStatus] = useState<string>('todos');
  const [periodo, setPeriodo] = useState<string>('7');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<number | null>(null);

  const lista = useMemo(() => {
    const agora = Date.now();
    return (pedidos ?? [])
      .filter((p) => (status === 'todos' ? true : p.status === status))
      .filter((p) => {
        if (periodo === 'tudo') return true;
        const limite = periodo === 'hoje' ? 1 : 7;
        return agora - new Date(p.criadoEm).getTime() <= limite * 86400000;
      })
      .filter((p) => {
        const t = busca.trim().toLowerCase();
        if (!t) return true;
        return p.id.toLowerCase().includes(t) || p.cliente.nome.toLowerCase().includes(t);
      })
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  }, [pedidos, status, periodo, busca]);

  // cancelado continua na lista, mas não é venda
  const soma = lista.filter((p) => p.status !== 'cancelado').reduce((s, p) => s + p.total, 0);
  const atual: Pedido | undefined = lista.find((p) => p.numero === aberto);

  const mudar = (pedido: Pedido, novo: string) => alterar.mutate({ numero: pedido.numero, body: { status: novo as never } });

  return (
    <div className="pedidos">
      <div className="pedidos__lista">
        <div className="pedidos__filtros-2">
          <div className="filtros filtros--status">
            {FILTROS.map(([id, nome]) => (
              <button
                key={id}
                type="button"
                className={['chip', status === id ? 'chip--ativo' : ''].join(' ').trim()}
                onClick={() => setStatus(id)}
              >
                {nome}
              </button>
            ))}
          </div>
          <div className="filtros filtros--periodo">
            {PERIODOS.map(([id, nome]) => (
              <button
                key={id}
                type="button"
                className={['chip', periodo === id ? 'chip--ativo' : ''].join(' ').trim()}
                onClick={() => setPeriodo(id)}
              >
                {nome}
              </button>
            ))}
          </div>
          <input
            className="campo campo--mini"
            placeholder="Buscar PLG-#### ou nome"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <p className="nota">
          {lista.length} pedidos · {brl(soma)}
        </p>

        {lista.length === 0 && <p className="nota pedidos__vazio-lista">Nenhum pedido nesse filtro.</p>}

        {lista.map((pedido) => {
          const c = canal(pedido.canal);
          return (
            <button
              key={pedido.id}
              type="button"
              className={['pedido-linha', pedido.numero === aberto ? 'pedido-linha--ativo' : ''].join(' ').trim()}
              onClick={() => setAberto(pedido.numero)}
            >
              <span className="pedido-linha__canal" style={{ ['--canal' as string]: c.cor }}>
                {c.nome}
              </span>
              <span className="pedido-linha__cliente">
                <strong>{pedido.id}</strong>
                <span className="nota">
                  {pedido.cliente.nome} · {desde(pedido.criadoEm)}
                </span>
              </span>
              <span className="nota">{STATUS_PEDIDO[pedido.status]?.nome ?? pedido.status}</span>
              <span className="pedido-linha__total">{brl(pedido.total)}</span>
            </button>
          );
        })}
      </div>

      <aside className="pedidos__detalhe" hidden={!atual}>
        {atual && (
          <article className="pedido-detalhe">
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <strong className="pedido-detalhe__total">{brl(atual.total)}</strong>
                <button type="button" className="icone-botao" aria-label="Fechar" onClick={() => setAberto(null)}>
                  ✕
                </button>
              </div>
            </header>

            <BlocoEtapas pedido={atual} aoMudar={(novo) => mudar(atual, novo)} />

            <dl className="pedido-detalhe__dados">
              <dt>Cliente</dt>
              <dd>{atual.cliente.nome}</dd>
              <dt>Telefone</dt>
              <dd>{atual.cliente.telefone || '—'}</dd>
              <dt>{atual.tipo === 'entrega' ? 'Entrega' : 'Retirada'}</dt>
              <dd>{atual.tipo === 'entrega' ? atual.endereco || '—' : 'no balcão'}</dd>
            </dl>

            <ul className="pedido-detalhe__itens">
              {atual.itens.map((item, indice) => (
                <li key={`${atual.id}-${indice}`}>
                  <span>
                    {item.qtd}× {item.nome}
                  </span>
                  <span className="nota">{item.detalhe || ''}</span>
                  <strong>{brl(item.preco * item.qtd)}</strong>
                </li>
              ))}
            </ul>

            <section className="historico">
              <span className="campo-rotulo">Linha do tempo</span>
              <ol className="historico__lista">
                {(atual.historico ?? []).map((h, indice) => (
                  <li key={`${atual.id}-h${indice}`}>
                    <span className="historico__ponto" />
                    <span className="nota">
                      {STATUS_PEDIDO[h.status]?.nome ?? h.status} · {dataHora(h.em)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </article>
        )}
      </aside>
    </div>
  );
};
