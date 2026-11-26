import { el, limpar, toast } from '../../shared/ui/dom.js';
import { brl, desde, hora } from '../../shared/format/format.js';
import { canal, STATUS_PEDIDO } from '../../shared/config/site.js';
import { listar, definirStatus } from '../../api/services/orders.service.js';
import { cartao, blocoEtapas } from './comandas.js';

const ABERTOS = ['preparo', 'pronto'];

let selecionado: any = null;

const ficha = (pedido: any, { desenhar, fechar }: { desenhar: () => void; fechar: () => void }) => {
  const c = canal(pedido.canal);
  return el('article', { class: 'pedido-detalhe cozinha__ficha' }, [
    el('header', { class: 'pedido-detalhe__topo' }, [
      el('div', {}, [
        el('span', { class: 'canal-selo', style: { '--canal': c.cor } }, c.nome),
        el('h2', {}, pedido.id),
        el('span', { class: 'nota' }, `${hora(pedido.criadoEm)} · ${desde(pedido.criadoEm)} · ${pedido.tipo}`),
      ]),
      el('div', { class: 'cozinha__ficha-dir' }, [
        el('strong', { class: 'pedido-detalhe__total' }, brl(pedido.total)),
        el('button', { type: 'button', class: 'icone-botao', 'aria-label': 'Fechar detalhe', onclick: fechar }, '✕'),
      ]),
    ]),

    blocoEtapas(pedido, {
      acao: true,
      aoMudar: (status: any) => {
        definirStatus(pedido.numero, status);
        toast(`${pedido.id} → ${STATUS_PEDIDO[status].nome.toLowerCase()}`);
        desenhar();
      },
    }),

    el('dl', { class: 'pedido-detalhe__dados' }, [
      el('dt', {}, 'Cliente'), el('dd', {}, pedido.cliente.nome),
      el('dt', {}, 'Telefone'), el('dd', {}, pedido.cliente.telefone || '—'),
      el('dt', {}, pedido.tipo === 'entrega' ? 'Entrega' : 'Retirada'),
      el('dd', {}, pedido.tipo === 'entrega' ? (pedido.endereco || '—') : 'no balcão'),
      pedido.observacao ? el('dt', {}, 'Observação') : null,
      pedido.observacao ? el('dd', { class: 'cozinha__obs' }, pedido.observacao) : null,
    ]),

    el('ul', { class: 'pedido-detalhe__itens' }, pedido.itens.map((i: any) =>
      el('li', {}, [
        el('span', {}, `${i.qtd}× ${i.nome}`),
        el('span', { class: 'nota' }, i.detalhe || ''),
        el('strong', {}, brl(i.preco * i.qtd)),
      ])
    )),
  ]);
};

export const renderCozinha = (alvo: any) => {
  const grade = el('div', { class: 'cozinha' });
  const detalheEl = el('aside', { class: 'cozinha__detalhe' });
  const quadro = el('div', { class: 'cozinha__quadro' });
  const topo = el('div', { class: 'cozinha-topo' });

  const desenhar = () => {
    const fila = listar()
      .filter((p) => ABERTOS.includes(p.status))
      .sort((a, b) => a.criadoEm - b.criadoEm);

    if (selecionado && !fila.some((p) => p.numero === selecionado)) selecionado = null;

    limpar(grade);
    if (!fila.length) {
      grade.append(el('p', { class: 'cozinha__vazio' }, 'Nenhum pedido na fila. A cozinha está em dia.'));
    } else {
      grade.append(...fila.map((p) =>
        cartao(p, {
          ativo: p.numero === selecionado,
          aoAbrir: () => {
            selecionado = p.numero;
            desenhar();
            if (window.innerWidth <= 1024) {
              document.querySelector('.cozinha__detalhe')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          },
          lateral: el('button', {
            type: 'button',
            class: `botao botao--grande ${p.status === 'pronto' ? 'botao--discreto' : 'botao--primario'}`,
            onclick: () => {
              definirStatus(p.numero, 'pronto');
              toast(`${p.id} marcado como pronto`);
              desenhar();
            },
          }, p.status === 'pronto' ? '✓ Pronto' : 'Marcar pronto'),
        })
      ));
    }

    limpar(detalheEl);
    detalheEl.hidden = !selecionado;
    quadro.classList.toggle('cozinha__quadro--com-detalhe', Boolean(selecionado));
    const alvoDetalhe = fila.find((p) => p.numero === selecionado);
    if (alvoDetalhe) {
      detalheEl.append(ficha(alvoDetalhe, {
        desenhar,
        fechar: () => { selecionado = null; desenhar(); },
      }));
    }
  };

  limpar(topo);
  topo.append(
    el('span', { class: 'nota' }, 'ordem de chegada · toque no cartão para abrir a ficha'),
    el('button', {
      type: 'button', class: 'botao botao--fantasma botao--mini',
      onclick: () => { desenhar(); toast('Fila atualizada'); },
    }, 'Atualizar agora'),
  );

  quadro.append(grade, detalheEl);
  alvo.append(topo, quadro);

  desenhar();
  const relogio = setInterval(desenhar, 5000);
  return () => clearInterval(relogio);
};
