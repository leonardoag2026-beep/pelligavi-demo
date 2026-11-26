import { el } from '../../shared/ui/dom.js';
import { brl, desde } from '../../shared/format/format.js';
import { canal, STATUS_PEDIDO } from '../../shared/config/site.js';

const PASSOS_ENTREGA = ['preparo', 'pronto', 'rota', 'entregue'];
const PASSOS_BALCAO = ['preparo', 'pronto', 'retirado'];

const ACAO: Record<string, string> = {
  preparo: 'Voltar para preparo',
  pronto: 'Marcar pronto',
  rota: 'Saiu para entrega',
  entregue: 'Marcar entregue',
  retirado: 'Marcar retirado',
};

export const passosDe = (pedido: any) => (pedido.tipo === 'entrega' ? PASSOS_ENTREGA : PASSOS_BALCAO);

interface OpcoesCartao {
  ativo?: boolean;
  aoAbrir?: () => void;
  lateral?: Node | null;
}

export const cartao = (pedido: any, { ativo = false, aoAbrir, lateral = null }: OpcoesCartao = {}) => {
  const c = canal(pedido.canal);
  const visiveis = pedido.itens.slice(0, 4);
  const resto = pedido.itens.length - visiveis.length;
  return el('article', {
    class: `comanda comanda--cartao ${ativo ? 'comanda--ativo' : ''} ${pedido.status === 'pronto' ? 'comanda--pronta' : ''}`,
    role: 'button',
    tabindex: '0',
    onclick: (evento: any) => {
      if (evento.target.closest('button')) return;
      aoAbrir?.();
    },
    onkeydown: (evento: any) => {
      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        aoAbrir?.();
      }
    },
  }, [
    el('header', { class: 'comanda__topo' }, [
      el('div', {}, [
        el('strong', { class: 'comanda__numero' }, pedido.id),
        el('span', { class: 'comanda__canal', style: { '--canal': c.cor } }, c.nome),
      ]),
      el('span', { class: 'comanda__tempo' }, desde(pedido.criadoEm)),
    ]),
    el('p', { class: 'comanda__cliente' }, pedido.cliente.nome),
    el('ul', { class: 'comanda__itens' }, [
      ...visiveis.map((item: any) => el('li', {}, [
        el('strong', {}, `${item.qtd}× ${item.nome}`),
        item.detalhe ? el('span', { class: 'nota' }, item.detalhe) : null,
      ])),
      resto > 0 ? el('li', {}, el('span', { class: 'nota' }, `+ ${resto} ${resto === 1 ? 'item' : 'itens'}`)) : null,
    ]),
    pedido.observacao ? el('p', { class: 'comanda__obs' }, `obs: ${pedido.observacao}`) : null,
    el('footer', { class: 'comanda__acoes' }, [
      lateral,
      el('span', { class: 'comanda__total' }, brl(pedido.total)),
    ]),
  ]);
};

export const selo = (pedido: any) =>
  el('span', { class: `selo selo--${pedido.status}` }, STATUS_PEDIDO[pedido.status]?.nome || pedido.status);

export const blocoEtapas = (pedido: any, { aoMudar, acao = false }: { aoMudar: (status: string) => void; acao?: boolean }) => {
  const morto = ['cancelado', 'reembolsado'].includes(pedido.status);
  const passos = passosDe(pedido);
  const atual = passos.indexOf(pedido.status);
  const lista = morto ? passos.concat([pedido.status]) : passos;
  return el('div', { class: 'status-pedido' }, [
    el('span', { class: 'campo-rotulo' }, acao ? 'Marcar etapa' : 'Situação do pedido'),
    el('div', { class: 'status-pedido__passos' }, lista.map((id) => {
      const ativo = pedido.status === id;
      const feito = !morto && atual > -1 && passos.indexOf(id) < atual;
      return el('button', {
        type: 'button',
        class: `status-pedido__passo ${ativo ? 'status-pedido__passo--ativo' : ''} ${feito ? 'status-pedido__passo--feito' : ''}`,
        disabled: morto || ativo,
        onclick: () => aoMudar(id),
      }, acao ? ACAO[id] : STATUS_PEDIDO[id].nome);
    })),
    morto
      ? el('p', { class: 'nota' }, `Pedido ${STATUS_PEDIDO[pedido.status].nome.toLowerCase()}${pedido.motivoCancelamento ? ` · motivo: ${pedido.motivoCancelamento}` : ''}.`)
      : null,
  ]);
};
