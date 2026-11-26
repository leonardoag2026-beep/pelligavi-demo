import { el } from '../../shared/ui/dom.js';
import { config } from '../../api/services/config.service.js';
import { brl } from '../../shared/format/format.js';
import { relatorio } from '../../api/services/relatorios.service.js';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ICONE: Record<string, string> = {
  saldo: '<path d="M4 12l5 5L20 6"/>',
  gasto: '<path d="M4 12h16"/><path d="M14 6l6 6-6 6"/>',
  receita: '<path d="M7 17L17 7"/><path d="M9 7h8v8"/>',
  despesa: '<path d="M17 7L7 17"/><path d="M15 17H7V9"/>',
  lupa: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/>',
  lista: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
};
const svg = (k: any) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONE[k]}</svg>`;

const serie = async (dias: number) => {
  const ate = new Date();
  const de = new Date(ate.getFullYear(), ate.getMonth(), ate.getDate() - (dias - 1));
  const dados = await relatorio(de.getTime(), ate.getTime());
  const receita = new Map(dados.vendasPorDia.map((d) => [d.dia, d.total]));
  const compras = new Map(dados.comprasPorDia.map((d) => [d.dia, d.total]));
  const pontos: any[] = [];
  for (let i = dias - 1; i >= 0; i -= 1) {
    const d = new Date(ate.getFullYear(), ate.getMonth(), ate.getDate() - i);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    pontos.push({ rotulo: DIAS[d.getDay()], receita: receita.get(chave) || 0, despesa: compras.get(chave) || 0 });
  }
  return pontos;
};

export const renderRelatorios = (alvo: any) => {
  const raiz = el('div', { class: 'analise' });
  alvo.append(raiz);
  let periodo = 'diario';

  const desenhar = async () => {
    const dias = periodo === 'ano' ? 30 : periodo === 'mensal' ? 30 : periodo === 'semanal' ? 7 : 7;
    const pontos = await serie(dias);
    const receita = pontos.reduce((s, p) => s + p.receita, 0);
    const despesa = pontos.reduce((s, p) => s + p.despesa, 0);
    const saldo = receita - despesa;
    const topo = Math.max(...pontos.map((p) => Math.max(p.receita, p.despesa)), 1);
    const metaPct = Math.min(100, Math.round((receita / config().metaFaturamento) * 100));

    raiz.replaceChildren(
      el('div', { class: 'analise__metricas' }, [
        el('div', { class: 'analise__metrica' }, [
          el('span', { class: 'analise__rotulo', html: `<i>${svg('saldo')}</i> Saldo total` }),
          el('strong', {}, brl(saldo)),
        ]),
        el('div', { class: 'analise__metrica analise__metrica--dir' }, [
          el('span', { class: 'analise__rotulo', html: `<i>${svg('gasto')}</i> Gasto total` }),
          el('strong', { class: 'analise__negativo' }, `-${brl(despesa)}`),
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
        el('p', { class: 'visao__meta-nota' }, `${metaPct}% das suas despesas, parece bom!`),
      ]),

      el('section', { class: 'analise__folha' }, [
        el('div', { class: 'analise__segmentado' }, [
          ['diario', 'Diário'], ['semanal', 'Semanal'], ['mensal', 'Mensal'], ['ano', 'Ano'],
        ].map(([id, nome]) => el('button', {
          type: 'button',
          class: `analise__segmento ${periodo === id ? 'analise__segmento--ativo' : ''}`,
          onclick: () => { periodo = id; desenhar(); },
        }, nome))),

        el('div', { class: 'analise__grafico' }, [
          el('header', { class: 'analise__grafico-topo' }, [
            el('h2', {}, 'Receitas & Despesas'),
            el('div', { class: 'analise__acoes' }, [
              el('button', { type: 'button', class: 'analise__acao', html: svg('lupa') }),
              el('button', { type: 'button', class: 'analise__acao', html: svg('lista') }),
            ]),
          ]),
          el('div', { class: 'analise__plot' }, [
            el('div', { class: 'analise__eixo' }, ['15k', '10k', '5k', '1k'].map((v) =>
              el('span', {}, v))),
            el('div', { class: 'analise__barras' }, pontos.map((p) =>
              el('div', { class: 'analise__dia' }, [
                el('div', { class: 'analise__par' }, [
                  el('span', {
                    class: 'analise__barra analise__barra--rec',
                    style: { height: `${Math.max(2, Math.round((p.receita / topo) * 100))}%` },
                    title: `Receita ${brl(p.receita)}`,
                  }),
                  el('span', {
                    class: 'analise__barra analise__barra--des',
                    style: { height: `${Math.max(2, Math.round((p.despesa / topo) * 100))}%` },
                    title: `Despesa ${brl(p.despesa)}`,
                  }),
                ]),
                el('span', { class: 'analise__dia-nome' }, p.rotulo),
              ])
            )),
          ]),
          el('div', { class: 'analise__base' }),
        ]),

        el('div', { class: 'analise__resumo' }, [
          el('div', { class: 'analise__resumo-item' }, [
            el('span', { class: 'analise__resumo-icone analise__resumo-icone--rec', html: svg('receita') }),
            el('span', { class: 'analise__resumo-rotulo' }, 'Receitas'),
            el('strong', { class: 'analise__resumo-valor analise__resumo-valor--rec' }, brl(receita)),
          ]),
          el('div', { class: 'analise__resumo-item' }, [
            el('span', { class: 'analise__resumo-icone analise__resumo-icone--des', html: svg('despesa') }),
            el('span', { class: 'analise__resumo-rotulo' }, 'Despesas'),
            el('strong', { class: 'analise__resumo-valor analise__resumo-valor--des' }, `-${brl(despesa)}`),
          ]),
        ]),

        el('div', { class: 'analise__metas' }, [
          el('h2', { class: 'analise__metas-titulo' }, 'Minhas metas'),
          el('div', { class: 'analise__meta-linha' }, [
            el('div', { class: 'analise__meta-texto' }, [
              el('strong', {}, 'Faturamento do mês'),
              el('span', { class: 'nota' }, `Meta ${brl(config().metaFaturamento)} · faltam ${brl(Math.max(0, config().metaFaturamento - receita))}`),
            ]),
            el('div', { class: 'analise__meta-progresso' }, [
              el('div', { class: 'analise__meta-fill', style: { width: `${metaPct}%` } }),
            ]),
          ]),
        ]),
      ]),
    );
  };

  void desenhar();
};
