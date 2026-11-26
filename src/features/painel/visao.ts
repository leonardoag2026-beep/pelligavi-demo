import { brl } from '../../shared/format/format.js';
import { el } from '../../shared/ui/dom.js';
import { config } from '../../api/services/config.service.js';
import { resumo as resumoCrm, caixa } from '../../api/services/crm.service.js';

const PERIODOS = [
  { id: 'dia', nome: 'Diário', fator: 1, rotulo: 'hoje' },
  { id: 'semana', nome: 'Semanal', fator: 7, rotulo: 'esta semana' },
  { id: 'mes', nome: 'Mensal', fator: 30, rotulo: 'este mês' },
];

const icone = (tipo: any) => {
  const mapa: Record<string, string> = {
    pilha: '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/>',
    garfo: '<path d="M7 3v7a2 2 0 004 0V3"/><path d="M9 12v9"/><path d="M17 3c-2 2-2 5 0 7v11"/>',
    caminhao: '<path d="M2 6h11v9H2z"/><path d="M13 9h4l3 3v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    sacola: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8a3 3 0 016 0"/>',
    dinheiro: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    sino: '<path d="M6 16V10a6 6 0 1112 0v6l2 2H4l2-2z"/><path d="M10 20a2 2 0 004 0"/>',
  };
  const svg = mapa[tipo] || '';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${svg}</svg>`;
};

const rosquinha = (pct: any) => {
  const r = 26;
  const volta = 2 * Math.PI * r;
  return el('div', { class: 'visao__donut' }, [
    el('span', { class: 'visao__donut-centro' }, `${pct}%`),
    el('span', { class: 'visao__donut-rotulo' }, 'Fundo de reserva'),
    el('span', {
      class: 'visao__donut-aro',
      html: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="5"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="#2fd0a7" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(volta * pct) / 100} ${volta}" transform="rotate(-90 32 32)"/></svg>`,
    }),
  ]);
};

export const renderVisao = (alvo: any) => {
  const r = resumoCrm();
  const cx = caixa();
  let periodo = 'mes';

  const conteudo = el('div', { class: 'visao' });
  alvo.append(conteudo);

  const desenhar = () => {
    const p = PERIODOS.find((x) => x.id === periodo)!;
    const receita = r.faturamento * p.fator;
    const insumos = receita * 0.25;
    const fixos = 320000 * (p.fator / 30);
    const taxas = receita * 0.08;
    const gasto = insumos + fixos + taxas;
    const balanco = receita - gasto;
    const reserva = Math.max(0, Math.round((balanco / Math.max(receita, 1)) * 100));
    const metaPct = Math.min(100, Math.round((receita / config().metaFaturamento) * 100));

    conteudo.replaceChildren(
      el('header', { class: 'visao__topo' }, [
        el('div', { class: 'visao__saudacao' }, [
          el('h1', {}, 'Olá, Senhor Gerente'),
          el('span', { class: 'visao__boas-vindas' }, 'Bem-vindo, novamente!'),
          el('span', { class: 'visao__regua' }),
        ]),
        el('button', { class: 'visao__sino', type: 'button', html: icone('sino'), title: `${r.emAndamento} pedidos em andamento` }),
      ]),

      el('div', { class: 'visao__metricas' }, [
        el('div', { class: 'visao__metrica' }, [
          el('span', { class: 'visao__metrica-rotulo', html: `<i>${icone('dinheiro')}</i> Total balanço` }),
          el('strong', {}, brl(balanco)),
        ]),
        el('div', { class: 'visao__metrica visao__metrica--dir' }, [
          el('span', { class: 'visao__metrica-rotulo', html: `<i>${icone('sacola')}</i> Gasto total` }),
          el('strong', { class: 'visao__negativo' }, `-${brl(gasto)}`),
        ]),
      ]),

      el('div', { class: 'visao__meta' }, [
        el('div', { class: 'visao__meta-linha' }, [
          el('span', { class: 'visao__meta-pct' }, `${metaPct}%`),
          el('span', { class: 'visao__meta-alvo' }, brl(config().metaFaturamento)),
        ]),
        el('div', { class: 'visao__barra' }, [
          el('div', { class: 'visao__barra-fill', style: { width: `${metaPct}%` } }),
        ]),
        el('p', { class: 'visao__meta-nota' }, `${metaPct}% da meta de faturamento — ${p.rotulo} você fez ${brl(receita)}.`),
      ]),

      el('section', { class: 'visao__cartao' }, [
        el('div', { class: 'visao__reserva' }, [
          rosquinha(reserva),
          el('div', { class: 'visao__receitas' }, [
            el('div', { class: 'visao__receita' }, [
              el('span', { class: 'visao__receita-icone', html: icone('pilha') }),
              el('div', {}, [
                el('span', { class: 'visao__receita-rotulo' }, 'Receita total'),
                el('strong', {}, brl(receita)),
              ]),
            ]),
            el('div', { class: 'visao__receita' }, [
              el('span', { class: 'visao__receita-icone', html: icone('garfo') }),
              el('div', {}, [
                el('span', { class: 'visao__receita-rotulo' }, 'Custo de insumos'),
                el('strong', { class: 'visao__negativo' }, `-${brl(insumos)}`),
              ]),
            ]),
          ]),
        ]),
      ]),

      el('div', { class: 'visao__segmentado' }, PERIODOS.map((x) =>
        el('button', {
          type: 'button',
          class: `visao__segmento ${x.id === periodo ? 'visao__segmento--ativo' : ''}`,
          onclick: () => { periodo = x.id; desenhar(); },
        }, x.nome)
      )),

      el('ul', { class: 'visao__linhas' }, [
        { icone: 'caminhao', titulo: 'Delivery', quando: '13:27 - hoje', rotulo: 'Vendas', valor: receita * 0.78, cor: '#2fd0a7' },
        { icone: 'sacola', titulo: 'Insumos', quando: '17:00 - hoje', rotulo: 'Compras', valor: -insumos, cor: '#2fd0a7' },
        { icone: 'pilha', titulo: 'Salários', quando: '8:30 - dia 5', rotulo: 'Custo fixo', valor: -fixos, cor: '#2fd0a7' },
      ].map((l) =>
        el('li', { class: 'visao__linha' }, [
          el('span', { class: 'visao__linha-icone', html: icone(l.icone) }),
          el('div', { class: 'visao__linha-texto' }, [
            el('strong', {}, l.titulo),
            el('span', { class: 'visao__linha-quando' }, l.quando),
          ]),
          el('span', { class: 'visao__linha-rotulo' }, l.rotulo),
          el('strong', { class: `visao__linha-valor ${l.valor < 0 ? 'visao__negativo' : ''}` }, `${l.valor < 0 ? '-' : ''}${brl(Math.abs(l.valor))}`),
        ])
      )),

      el('div', { class: 'visao__rodape' }, [
        el('span', { class: 'nota' }, `Caixa: ${brl(cx.disponivel)} disponível · ${brl(cx.aReceber)} a receber`),
        el('span', { class: 'nota' }, `${r.pedidosHoje} pedidos hoje · ticket ${brl(r.ticket)}`),
      ])
    );
  };

  desenhar();
};
