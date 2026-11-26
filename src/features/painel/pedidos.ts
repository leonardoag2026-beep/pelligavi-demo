import { brl, desde, hora } from '../../shared/format/format.js';
import { el, limpar, toast } from '../../shared/ui/dom.js';
import { canal, STATUS_PEDIDO } from '../../shared/config/site.js';
import {
  listar, definirStatus, cancelar, podeCancelar, avancar, reembolsar,
} from '../../api/services/orders.service.js';
import { criarLink, registrarPagamento, saldoDoPedido } from '../../api/services/payment.service.js';
import { pedirCampos } from '../../shared/ui/dialogo.js';
import { cartao, selo, blocoEtapas } from './comandas.js';

const FILTROS = [
  { id: 'todos', nome: 'Todos' },
  { id: 'preparo', nome: 'Em preparo' },
  { id: 'pronto', nome: 'Prontos' },
  { id: 'rota', nome: 'Em rota' },
  { id: 'entregue', nome: 'Entregues' },
  { id: 'retirado', nome: 'Retirados' },
  { id: 'encerrado', nome: 'Encerrados' },
];

const PERIODOS = [
  { id: 0, nome: 'Tudo' },
  { id: 1, nome: 'Hoje' },
  { id: 7, nome: '7 dias' },
];

let filtro = 'todos';
let periodo = 0;
let busca = '';
let selecionado: any = null;

const pertence = (pedido: any, id: any) =>
  id === 'todos'
    ? true
    : id === 'encerrado'
      ? ['cancelado', 'reembolsado'].includes(pedido.status)
      : pedido.status === id;

const passaPeriodo = (pedido: any) =>
  !periodo || pedido.criadoEm >= Date.now() - periodo * 86400000;

const passaBusca = (pedido: any) =>
  !busca || pedido.cliente.nome.toLowerCase().includes(busca.toLowerCase()) || pedido.id.toLowerCase().includes(busca.toLowerCase());

const blocoHistorico = (pedido: any) =>
  el('section', { class: 'historico' }, [
    el('span', { class: 'campo-rotulo' }, 'Histórico de status'),
    el('ol', { class: 'historico__lista' }, (pedido.historico || []).map((h: any) =>
      el('li', {}, [
        el('span', { class: 'historico__ponto' }),
        el('strong', {}, STATUS_PEDIDO[h.status]?.nome || h.status),
        el('span', { class: 'nota' }, `${hora(h.em)} · ${desde(h.em)}`),
      ])
    )),
  ]);

const blocoPagamento = (pedido: any, desenhar: any) => {
  const pagamentos = pedido.pagamentos || [];
  const { falta } = saldoDoPedido(pedido);
  const forma = el('select', { class: 'campo campo--mini' }, [
    el('option', { value: 'dinheiro' }, 'Dinheiro'),
    el('option', { value: 'pix' }, 'PIX'),
    el('option', { value: 'cartao' }, 'Crédito'),
    el('option', { value: 'debito' }, 'Débito'),
  ]);
  const valor = el('input', {
    class: 'campo campo--preco', type: 'number', min: '0', step: '0.5',
    value: (falta / 100).toFixed(2),
    disabled: falta <= 0,
  });
  return el('section', { class: 'pagamentos-pedido' }, [
    el('span', { class: 'campo-rotulo' }, 'Pagamentos'),
    el('ul', { class: 'relatorio-lista' }, pagamentos.map((p: any) =>
      el('li', {}, [
        el('span', {}, p.metodo.toUpperCase()),
        el('strong', {}, brl(p.valor)),
        el('span', { class: 'nota' }, hora(p.em)),
      ])
    )),
    el('div', { class: 'pagamentos-pedido__resumo' }, [
      el('span', { class: 'nota' }, `subtotal ${brl(pedido.subtotal)}`),
      pedido.taxa ? el('span', { class: 'nota' }, `+ taxa ${brl(pedido.taxa)}`) : null,
      pedido.desconto ? el('span', { class: 'nota' }, `− desconto ${brl(pedido.desconto)}`) : null,
      el('strong', { class: falta ? 'negativo' : 'positivo' }, falta ? `falta ${brl(falta)}` : 'quitado'),
    ]),
    falta > 0 && !['cancelado', 'reembolsado'].includes(pedido.status)
      ? el('div', { class: 'pagamentos-pedido__novo' }, [
          forma,
          valor,
          el('button', {
            type: 'button', class: 'botao botao--mini botao--primario',
            onclick: async () => {
              try {
                registrarPagamento(pedido.numero, { metodo: forma.value, valor: Math.round(Number(valor.value) * 100) });
                toast('Pagamento registrado');
                desenhar();
              } catch (e) {
                toast(e instanceof Error ? e.message : String(e));
              }
            },
          }, 'Registrar'),
        ])
      : null,
  ]);
};

const detalhe = (pedido: any, desenhar: any) => {
  if (!pedido) return el('div', { class: 'pedidos__vazio' }, [
    el('p', {}, 'Escolha um pedido no histórico'),
    el('span', { class: 'nota' }, 'Os detalhes, o status e os itens aparecem aqui.'),
  ]);

  const encerrado = ['reembolsado', 'cancelado', 'entregue', 'retirado'].includes(pedido.status);

  return el('article', { class: 'pedido-detalhe' }, [
    el('header', { class: 'pedido-detalhe__topo' }, [
      el('div', {}, [
        el('span', { class: 'canal-selo', style: { '--canal': canal(pedido.canal).cor } }, canal(pedido.canal).nome),
        el('h2', {}, pedido.id),
        el('span', { class: 'nota' }, `${hora(pedido.criadoEm)} · ${desde(pedido.criadoEm)} · ${pedido.tipo}`),
      ]),
      el('strong', { class: 'pedido-detalhe__total' }, brl(pedido.total)),
    ]),

    blocoEtapas(pedido, {
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
    ]),

    el('ul', { class: 'pedido-detalhe__itens' }, pedido.itens.map((i: any) =>
      el('li', {}, [
        el('span', {}, `${i.qtd}× ${i.nome}`),
        el('span', { class: 'nota' }, i.detalhe || ''),
        el('strong', {}, brl(i.preco * i.qtd)),
      ])
    )),

    blocoPagamento(pedido, desenhar),
    blocoHistorico(pedido),

    el('div', { class: 'pedido-detalhe__acoes' }, [
      STATUS_PEDIDO[pedido.status]?.proximo && !encerrado
        ? el('button', {
            type: 'button', class: 'botao botao--mini botao--primario',
            onclick: async () => { avancar(pedido.numero); desenhar(); },
          }, `→ ${STATUS_PEDIDO[STATUS_PEDIDO[pedido.status]?.proximo || '']?.nome || 'Avançar'}`)
        : null,
      el('button', {
        type: 'button', class: 'botao botao--mini botao--fantasma',
        onclick: async () => {
          const link = criarLink({ valor: pedido.total, descricao: `Pedido ${pedido.id} — ${pedido.cliente.nome}` });
          navigator.clipboard?.writeText(`https://pay.pelligavi.com.br/l/${link.code}`);
          toast(`Link ${link.code} copiado.`);
        },
      }, 'Link de pagamento'),
      podeCancelar(pedido)
        ? el('button', {
            type: 'button', class: 'botao botao--mini botao--perigo',
            onclick: async () => {
              const resposta = await pedirCampos({ titulo: 'Cancelar pedido', campos: [{ chave: 'motivo', rotulo: 'Motivo (obrigatório)' }], rotuloOk: 'Cancelar pedido' });
              const motivo = resposta?.motivo;
              if (!motivo) return;
              try {
                cancelar(pedido.numero, motivo);
                toast(`${pedido.id} cancelado`);
                desenhar();
              } catch (e) {
                toast(e instanceof Error ? e.message : String(e));
              }
            },
          }, 'Cancelar pedido')
        : null,
      !encerrado
        ? el('button', {
            type: 'button', class: 'botao botao--mini botao--discreto',
            onclick: async () => { reembolsar(pedido.numero); toast('Reembolso registrado'); desenhar(); },
          }, 'Reembolsar')
        : null,
    ]),
  ]);
};

export const renderPedidos = (alvo: any) => {
  const listaEl = el('div', { class: 'cozinha pedidos__grade' });
  const detalheEl = el('aside', { class: 'pedidos__detalhe' });
  const contadores: Record<string, HTMLButtonElement> = {};

  const abrir = (numero: any) => {
    selecionado = numero;
    desenhar();
    if (window.innerWidth <= 1024) {
      document.querySelector('.pedidos__detalhe')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const desenhar = () => {
    const todos = listar();
    const filtrados = todos
      .filter((p) => pertence(p, filtro))
      .filter(passaPeriodo)
      .filter(passaBusca);

    limpar(listaEl);
    const atual = todos.find((p) => p.numero === selecionado);
    if (atual && !filtrados.some((p) => p.numero === selecionado)) selecionado = null;

    if (filtrados.length) {
      listaEl.append(...filtrados.map((p) => cartao(p, {
        ativo: p.numero === selecionado,
        aoAbrir: () => abrir(p.numero),
        lateral: selo(p),
      })));
    } else {
      listaEl.append(el('p', { class: 'nota pedidos__vazio-lista' }, 'Nenhum pedido com esses filtros.'));
    }

    limpar(detalheEl);
    detalheEl.append(detalhe(todos.find((p) => p.numero === selecionado), desenhar));

    Object.keys(contadores).forEach((chave) => {
      const chip = contadores[chave]!;
      const total = chave === 'todos' ? todos.length : todos.filter((p) => pertence(p, chave)).length;
      chip.textContent = `${FILTROS.find((f) => f.id === chave)?.nome || ''} ${total || ''}`.trim();
    });
  };

  const chips = el('div', { class: 'filtros filtros--status' }, FILTROS.map((f) => {
    const botao = el('button', {
      type: 'button',
      class: `chip ${filtro === f.id ? 'chip--ativo' : ''}`,
      onclick: async () => {
        filtro = f.id;
        [...chips.children].forEach((b) => b.classList.remove('chip--ativo'));
        botao.classList.add('chip--ativo');
        desenhar();
      },
    }, f.nome);
    contadores[f.id] = botao;
    return botao;
  }));

  const periodos = el('div', { class: 'filtros filtros--periodo' }, PERIODOS.map((p) =>
    el('button', {
      type: 'button',
      class: `chip chip--mini ${periodo === p.id ? 'chip--ativo' : ''}`,
      onclick: (evento: any) => {
        periodo = p.id;
        [...periodos.children].forEach((b) => b.classList.remove('chip--ativo'));
        evento.currentTarget.classList.add('chip--ativo');
        desenhar();
      },
    }, p.nome)
  ));

  const campoBusca = el('input', {
    class: 'campo campo--busca', type: 'search',
    placeholder: 'Buscar por cliente ou nº do pedido',
    oninput: (e: any) => { busca = e.target.value.trim(); desenhar(); },
  });

  alvo.append(
    el('div', { class: 'pedidos' }, [
      el('div', { class: 'pedidos__lista' }, [
        chips,
        el('div', { class: 'pedidos__filtros-2' }, [campoBusca, periodos]),
        listaEl,
      ]),
      detalheEl,
    ])
  );

  desenhar();
};
