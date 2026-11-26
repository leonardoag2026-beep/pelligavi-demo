import { el } from '../../shared/ui/dom.js';
import { hora } from '../../shared/format/format.js';
import { carregar, marcarLida } from '../../api/services/notificacoes.service.js';

const ICONES: Record<string, string> = {
  pedido: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8a3 3 0 016 0"/>',
  pagamento: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/>',
  financeiro: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/>',
  estoque: '<path d="M3 8l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 16l9 4 9-4"/>',
  sistema: '<path d="M6 16V10a6 6 0 1112 0v6l2 2H4l2-2z"/><path d="M10 20a2 2 0 004 0"/>',
};

const icone = (tipo: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONES[tipo] || ICONES.sistema}</svg>`;

const quando = (ts: number) => {
  const d = new Date(ts);
  return `${hora(ts)} · ${d.getDate()} de ${d.toLocaleDateString('pt-BR', { month: 'long' })}`;
};

export const renderNotificacoes = (alvo: any) => {
  const corpo = el('div', { class: 'notif' });
  alvo.append(corpo);

  const desenhar = (itens: any[]) => {
    if (!itens.length) {
      corpo.replaceChildren(el('p', { class: 'nota' }, 'Nada por aqui ainda.'));
      return;
    }
    const grupos = new Map();
    itens.forEach((n: any) => {
      const g = n.grupo || 'Antigas';
      if (!grupos.has(g)) grupos.set(g, []);
      grupos.get(g).push(n);
    });
    const blocos: any = [];
    grupos.forEach((lista, nome) => {
      blocos.push(el('h3', { class: 'notif__grupo' }, nome));
      blocos.push(el('ul', { class: 'notif__lista' }, lista.map((n: any) => el('li', {
        class: `notif__item ${n.lida ? 'notif__item--lida' : ''}`,
      }, [
        el('button', {
          type: 'button',
          class: 'notif__linha',
          onclick: async () => {
            await marcarLida(n.id);
            n.lida = true;
            desenhar(itens);
          },
        }, [
          el('span', { class: `notif__icone notif__icone--${n.tipo}`, html: icone(n.tipo) }),
          el('span', { class: 'notif__texto' }, [
            el('strong', {}, n.titulo),
            n.texto ? el('span', { class: 'notif__descricao' }, n.texto) : null,
            n.meta ? el('span', { class: 'notif__meta' }, n.meta) : null,
            el('span', { class: 'notif__quando' }, quando(n.quando)),
          ]),
        ]),
      ]))));
    });
    corpo.replaceChildren(...blocos);
  };

  carregar()
    .then(desenhar)
    .catch(() => corpo.replaceChildren(el('p', { class: 'nota' }, 'Não consegui carregar as notificações agora.')));
};
