import { el } from '../../shared/ui/dom.js';
import { brl, hora } from '../../shared/format/format.js';
import { listar } from '../../api/services/orders.service.js';
import { toast } from '../../shared/ui/dom.js';

const ICONE: Record<string, string> = {
  venda: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  insumo: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8a3 3 0 016 0"/>',
  fixo: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>',
  taxa: '<path d="M3 12h18"/><path d="M12 3v18"/>',
  link: '<path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1"/>',
};
const svg = (k: any, w = 22) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONE[k]}</svg>`;

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const mesDe = (d: any) => MESES[new Date(d).getMonth()];

const lancamentos = () => {
  const itens: any = [];
  listar().forEach((p) => {
    if (p.status === 'cancelado') return;
    itens.push({
      tipo: 'receita', icone: 'venda', titulo: `Pedido ${p.id}`,
      quando: p.criadoEm, categoria: p.canal || 'Site', valor: p.total,
    });
  });
  const receita = itens.reduce((s: any, i: any) => s + i.valor, 0);
  const hoje = Date.now();
  itens.push({ tipo: 'despesa', icone: 'insumo', titulo: 'Ingredientes', quando: hoje - 86400000 * 2, categoria: 'Insumos', valor: Math.round(receita * 0.25) });
  itens.push({ tipo: 'despesa', icone: 'fixo', titulo: 'Aluguel', quando: hoje - 86400000 * 9, categoria: 'Imóvel', valor: 25000 });
  itens.push({ tipo: 'despesa', icone: 'taxa', titulo: 'Taxas de canal', quando: hoje - 86400000 * 4, categoria: 'Marketplace', valor: Math.round(receita * 0.08) });
  return itens.sort((a: any, b: any) => b.quando - a.quando);
};

const codigo = (prefixo: any) => `${prefixo}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const folhaCobrar = (receita: any) => {
  const fundo = el('div', { class: 'cobrar__fundo', onclick: (e: any) => { if (e.target === fundo) fundo.remove(); } });
  const corpo = el('div', { class: 'cobrar__caixa' });
  const resultado = el('div', { class: 'cobrar__resultado' });

  const gerar = (tipo: any) => {
    const valor = receita > 0 ? receita : 5000;
    const codigoLink = codigo(tipo === 'pix' ? 'PIX' : 'PLG');
    const url = tipo === 'pix'
      ? `https://pay.pelligavi.com.br/pix/${codigoLink}`
      : `https://pay.pelligavi.com.br/l/${codigoLink}`;
    resultado.replaceChildren(
      el('p', { class: 'nota' }, tipo === 'pix' ? 'Link de pagamento PIX' : 'Link de pagamento'),
      el('strong', { class: 'cobrar__link' }, url),
      el('span', { class: 'nota' }, `Valor ${brl(valor)} · válido por 24 h`),
      el('button', {
        type: 'button', class: 'botao botao--primario cobrar__copiar',
        onclick: () => { navigator.clipboard?.writeText(url); toast('Link copiado'); },
      }, 'Copiar link'),
    );
  };

  corpo.append(
    el('header', { class: 'cobrar__topo' }, [
      el('h2', {}, 'Cobrar'),
      el('button', { type: 'button', class: 'cobrar__fechar', onclick: () => fundo.remove() }, '✕'),
    ]),
    el('p', { class: 'nota' }, `Saldo a receber ${brl(receita)}`),
    el('button', { type: 'button', class: 'cobrar__opcao', onclick: () => gerar('link') }, [
      el('span', { class: 'cobrar__icone', html: svg('link') }),
      el('span', {}, [el('strong', {}, 'Gerar link de pagamento'), el('span', { class: 'nota' }, 'cartão, boleto ou débito')]),
    ]),
    el('button', { type: 'button', class: 'cobrar__opcao', onclick: () => gerar('pix') }, [
      el('span', { class: 'cobrar__icone cobrar__icone--pix', html: svg('venda') }),
      el('span', {}, [el('strong', {}, 'Gerar link de pagamento via PIX'), el('span', { class: 'nota' }, 'QR code e copia-e-cola')]),
    ]),
    resultado,
  );
  fundo.append(corpo);
  document.body.append(fundo);
};

export const renderTransacoes = (alvo: any) => {
  const itens = lancamentos();
  const receita = itens.filter((i: any) => i.tipo === 'receita').reduce((s: any, i: any) => s + i.valor, 0);
  const despesa = itens.filter((i: any) => i.tipo === 'despesa').reduce((s: any, i: any) => s + i.valor, 0);
  const saldo = receita - despesa;

  const grupos = new Map();
  itens.forEach((i: any) => {
    const m = mesDe(i.quando);
    if (!grupos.has(m)) grupos.set(m, []);
    grupos.get(m).push(i);
  });

  alvo.append(
    el('div', { class: 'trans' }, [
      el('div', { class: 'trans__saldo' }, [
        el('span', { class: 'trans__saldo-rotulo' }, 'Saldo total'),
        el('strong', { class: 'trans__saldo-valor' }, brl(saldo)),
      ]),
      el('div', { class: 'trans__par' }, [
        el('div', { class: 'trans__cartao trans__cartao--rec' }, [
          el('span', { class: 'trans__cartao-icone', html: svg('venda') }),
          el('span', { class: 'trans__cartao-rotulo' }, 'Receitas'),
          el('strong', {}, brl(receita)),
        ]),
        el('div', { class: 'trans__cartao trans__cartao--des' }, [
          el('span', { class: 'trans__cartao-icone', html: svg('taxa') }),
          el('span', { class: 'trans__cartao-rotulo' }, 'Despesas'),
          el('strong', {}, `-${brl(despesa)}`),
        ]),
      ]),
      el('button', { type: 'button', class: 'trans__cobrar', onclick: () => folhaCobrar(receita) }, [
        el('span', { html: svg('link', 18) }), el('span', {}, 'Cobrar'),
      ]),
      el('div', { class: 'trans__lista' }, [...grupos.entries()].map(([mes, lista]) =>
        el('section', { class: 'trans__mes' }, [
          el('h3', { class: 'trans__mes-titulo' }, mes),
          el('ul', {}, lista.map((i: any) =>
            el('li', { class: 'trans__linha' }, [
              el('span', { class: `trans__icone trans__icone--${i.tipo}`, html: svg(i.icone) }),
              el('div', { class: 'trans__texto' }, [
                el('strong', {}, i.titulo),
                el('span', { class: 'trans__quando' }, `${hora(i.quando)} · ${new Date(i.quando).getDate()} de ${mes}`),
              ]),
              el('span', { class: 'trans__categoria' }, i.categoria),
              el('strong', { class: `trans__valor trans__valor--${i.tipo}` }, `${i.tipo === 'receita' ? '+' : '-'}${brl(i.valor)}`),
            ])
          )),
        ])
      )),
    ])
  );
};
