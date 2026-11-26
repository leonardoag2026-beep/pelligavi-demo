import { Fragment } from 'react';
import { useGetNotificacoes, useMarcarLida } from '../hooks/notificacoes-api.hooks';
import type { Notificacao } from '../../../api/services/notificacoes';

// mesmos ícones da tela antiga (src/features/painel/notificacoes.ts)
const ICONES: Record<string, string> = {
  pedido: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8a3 3 0 016 0"/>',
  pagamento: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/>',
  financeiro: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/>',
  estoque: '<path d="M3 8l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 16l9 4 9-4"/>',
  sistema: '<path d="M6 16V10a6 6 0 1112 0v6l2 2H4l2-2z"/><path d="M10 20a2 2 0 004 0"/>',
};

const icone = (tipo: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${
    ICONES[tipo] ?? ICONES.sistema
  }</svg>`;

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

const quando = (iso: string) => {
  const data = new Date(iso);
  return `${hora(iso)} · ${data.getDate()} de ${data.toLocaleDateString('pt-BR', { month: 'long' })}`;
};

export const PainelNotificacoes: React.FC = () => {
  const { data } = useGetNotificacoes();
  const marcarLida = useMarcarLida();

  const lista: Notificacao[] = data?.dados ?? [];
  const grupos = lista.reduce<Record<string, Notificacao[]>>((mapa, item) => {
    const chave = item.grupo || 'Antigas';
    mapa[chave] = [...(mapa[chave] ?? []), item];
    return mapa;
  }, {});

  if (lista.length === 0) {
    return (
      <div className="notif">
        <p className="nota">Nada por aqui ainda.</p>
      </div>
    );
  }

  return (
    <div className="notif">
      {Object.entries(grupos).map(([grupo, itens]) => (
        <Fragment key={grupo}>
          <h3 className="notif__grupo">{grupo}</h3>
          <ul className="notif__lista">
            {itens.map((item) => (
              <li key={item.id} className={['notif__item', item.lida ? 'notif__item--lida' : ''].join(' ').trim()}>
                <button
                  type="button"
                  className="notif__linha"
                  onClick={() => !item.lida && marcarLida.mutate(item.id)}
                >
                  <span
                    className={`notif__icone notif__icone--${item.tipo}`}
                    dangerouslySetInnerHTML={{ __html: icone(item.tipo) }}
                  />
                  <span className="notif__texto">
                    <strong>{item.titulo}</strong>
                    {item.texto ? <span className="notif__descricao">{item.texto}</span> : null}
                    {item.meta ? <span className="notif__meta">{item.meta}</span> : null}
                    <span className="notif__quando">{quando(item.criadaEm)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Fragment>
      ))}
    </div>
  );
};

export default PainelNotificacoes;
