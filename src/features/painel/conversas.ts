import { hora, iniciais, primeiroNome, brl } from '../../shared/format/format.js';
import { el } from '../../shared/ui/dom.js';
import { canal } from '../../shared/config/site.js';
import { conversas, conversa, responder, marcarLida } from '../../api/services/crm.service.js';
import { porNumero, reembolsar } from '../../api/services/orders.service.js';
import { toast } from '../../shared/ui/dom.js';

let aberta: any = null;

const RESPOSTAS = {
  pedido: '',
  pagamento: 'Pode pagar no PIX por este link que eu gero na hora: pay.fornodavila.com.br/l/FDV-3Q9T',
  portaria: 'Anotado: entregador já está com a instrução de deixar na portaria.',
};

const sugestao = (texto: any) => {
  if (/fria|frio|faltou|errad|pedido/i.test(texto)) return RESPOSTAS.pedido;
  if (/pix|pagar|cart[aã]o|troco/i.test(texto)) return RESPOSTAS.pagamento;
  if (/portaria|entregador|saiu/i.test(texto)) return RESPOSTAS.portaria;
  return '';
};

const bolha = (m: any) =>
  el('div', { class: `bolha bolha--${m.de === 'loja' ? 'loja' : 'cliente'}` }, [
    el('p', {}, m.texto),
    el('span', { class: 'bolha__hora' }, hora(m.em)),
  ]);

const painelConversa = (id: any, redesenhar: any) => {
  const c = conversa(id);
  if (!c) return el('div', { class: 'conversa-vazia' }, 'Selecione uma conversa.');
  const pedido = c.pedido ? porNumero(Number(c.pedido.replace('FDV-', ''))) : null;
  const campo = el('textarea', { class: 'campo campo--area', rows: 3, placeholder: 'Escreva a resposta…' });
  const ultima = c.mensagens[c.mensagens.length - 1];
  campo.value = sugestao(ultima?.texto || '');

  return el('div', { class: 'conversa' }, [
    el('header', { class: 'conversa__topo' }, [
      el('div', { class: 'conversa__identidade' }, [
        el('span', { class: 'avatar' }, iniciais(c.nome)),
        el('div', {}, [
          el('strong', {}, c.nome),
          el('span', { class: 'nota' }, `${canal(c.canal).nome}${c.pedido ? ` · ${c.pedido}` : ''}`),
        ]),
      ]),
      el('div', { class: 'conversa__acoes' }, [
        pedido && pedido.pagamento?.status === 'pago' && !['reembolsado', 'cancelado'].includes(pedido.status)
          ? el('button', {
              type: 'button', class: 'botao botao--mini botao--perigo',
              onclick: () => { reembolsar(pedido.numero); toast(`Reembolso de ${brl(pedido.total)} feito.`); redesenhar(); },
            }, 'Reembolsar pedido')
          : null,
        el('button', {
          type: 'button', class: 'botao botao--mini botao--fantasma',
          onclick: () => { responder(id, 'Aplicado cupom de 15% para o próximo pedido.'); redesenhar(); },
        }, 'Cupom 15%'),
      ]),
    ]),
    el('div', { class: 'conversa__historico' }, c.mensagens.map(bolha)),
    el('div', { class: 'conversa__composer' }, [
      campo,
      el('button', {
        type: 'button', class: 'botao botao--primario',
        onclick: () => {
          const texto = campo.value.trim();
          if (!texto) return;
          responder(id, texto);
          redesenhar();
        },
      }, 'Responder'),
    ]),
  ]);
};

export const renderConversas = (alvo: any) => {
  const desenhar = () => {
    alvo.innerHTML = '';
    const lista = conversas();
    if (!aberta || !lista.some((c) => c.id === aberta)) aberta = lista[0]?.id || null;
    alvo.append(
      el('div', { class: 'caixa-entrada' }, [
        el('aside', { class: 'caixa-entrada__lista' }, [
          el('header', { class: 'caixa-entrada__topo' }, [
            el('h2', {}, 'Conversas'),
            el('span', { class: 'nota' }, `${lista.filter((c) => c.status === 'aberta').length} abertas`),
          ]),
          el('ul', {}, lista.map((c) =>
            el('li', {}, [
              el('button', {
                type: 'button', class: `item-conversa ${c.id === aberta ? 'item-conversa--ativa' : ''}`,
                onclick: () => { aberta = c.id; marcarLida(c.id); desenhar(); },
              }, [
                el('span', { class: 'avatar' }, iniciais(c.nome)),
                el('div', { class: 'item-conversa__texto' }, [
                  el('strong', {}, c.nome),
                  el('span', { class: 'nota' }, c.mensagens[c.mensagens.length - 1].texto.slice(0, 42) + '…'),
                ]),
                el('div', { class: 'item-conversa__meta' }, [
                  el('span', { class: 'canal-selo canal-selo--mini', style: { '--canal': canal(c.canal).cor } }, canal(c.canal).nome),
                  c.naoLidas ? el('span', { class: 'nao-lida' }, c.naoLidas) : null,
                ]),
              ]),
            ])
          )),
        ]),
        el('section', { class: 'caixa-entrada__painel' }, [painelConversa(aberta, desenhar)]),
      ])
    );
  };
  desenhar();
};
