import { brl, hora } from '../../shared/format/format.js';
import { el, limpar, toast } from '../../shared/ui/dom.js';
import { caixa, abrir, fechar, resumo } from '../../api/services/caixa.service.js';

const ROTULO: Record<string, string> = { pix: 'PIX', dinheiro: 'Dinheiro', cartao: 'Cartão de crédito', debito: 'Cartão de débito' };

export const renderCaixa = (alvo: any) => {
  const corpo = el('div', { class: 'caixa-painel' });

  const desenhar = () => {
    limpar(corpo);
    const c = resumo();

    if (!c.aberto) {
      const valor = el('input', { class: 'campo campo--preco', type: 'number', min: '0', step: '1', value: '200.00' });
      corpo.append(
        el('section', { class: 'cartao-painel caixa-fechado' }, [
          el('h2', {}, 'Caixa fechado'),
          el('p', { class: 'nota' }, 'Abra o caixa com o valor inicial (fundo de troco) para começar a receber.'),
          el('label', { class: 'campo-grupo campo-grupo--linha' }, [
            el('span', { class: 'campo-rotulo' }, 'Valor inicial'),
            valor,
          ]),
          el('button', {
            type: 'button', class: 'botao botao--primario',
            onclick: async () => {
              await abrir(Math.round(Number(valor.value) * 100));
              toast('Caixa aberto');
              desenhar();
            },
          }, 'Abrir caixa'),
          c.fechamentos?.length
            ? el('div', { class: 'caixa-historico' }, [
                el('span', { class: 'campo-rotulo' }, 'Últimos fechamentos'),
                el('ul', { class: 'relatorio-lista' }, c.fechamentos.slice(0, 5).map((f) =>
                  el('li', {}, [
                    el('span', {}, hora(f.fechadaEm)),
                    el('span', { class: 'nota' }, `esperado ${brl(f.esperado)} · contado ${brl(f.contado)}`),
                    el('strong', { class: f.diferenca === 0 ? 'positivo' : 'negativo' }, `${f.diferenca >= 0 ? '+' : ''}${brl(f.diferenca)}`),
                  ])
                )),
              ])
            : null,
        ])
      );
      return;
    }

    const contado = el('input', { class: 'campo campo--preco', type: 'number', min: '0', step: '1', value: (c.esperado / 100).toFixed(2) });
    const observacao = el('input', { class: 'campo', type: 'text', placeholder: 'observação (opcional)' });

    corpo.append(
      el('div', { class: 'kpis kpis--caixa' }, [
        el('article', { class: 'kpi' }, [el('span', { class: 'kpi__rotulo' }, 'Abertura'), el('strong', { class: 'kpi__valor' }, brl(c.valorInicial)), el('span', { class: 'kpi__detalhe' }, hora(c.abertaEm ?? Date.now()))]),
        el('article', { class: 'kpi' }, [el('span', { class: 'kpi__rotulo' }, 'Recebido'), el('strong', { class: 'kpi__valor' }, brl(c.total)), el('span', { class: 'kpi__detalhe' }, `${c.pedidos} pedidos`)]),
        el('article', { class: 'kpi kpi--destaque' }, [el('span', { class: 'kpi__rotulo' }, 'Esperado na gaveta'), el('strong', { class: 'kpi__valor' }, brl(c.esperado)), el('span', { class: 'kpi__detalhe' }, 'fundo + recebido')]),
      ]),
      el('div', { class: 'painel-grade' }, [
        el('section', { class: 'cartao-painel' }, [
          el('header', { class: 'cartao-painel__topo' }, [el('h2', {}, 'Por forma de pagamento'), el('span', { class: 'nota' }, 'desde a abertura')]),
          el('ul', { class: 'relatorio-lista' }, Object.entries(c.porForma).map(([metodo, valor]) =>
            el('li', {}, [el('span', {}, ROTULO[metodo] || metodo), el('strong', {}, brl(valor))])
          )),
          Object.keys(c.porForma).length ? null : el('p', { class: 'nota' }, 'Nenhum pagamento registrado ainda.'),
        ]),
        el('section', { class: 'cartao-painel' }, [
          el('header', { class: 'cartao-painel__topo' }, [el('h2', {}, 'Fechar caixa'), el('span', { class: 'nota' }, 'conferência')]),
          el('label', { class: 'campo-grupo campo-grupo--linha' }, [el('span', { class: 'campo-rotulo' }, 'Valor contado'), contado]),
          el('label', { class: 'campo-grupo' }, [el('span', { class: 'campo-rotulo' }, 'Observação'), observacao]),
          el('button', {
            type: 'button', class: 'botao botao--primario',
            onclick: async () => {
              const contagem = Math.round(Number(contado.value) * 100);
              const f = await fechar(contagem, observacao.value);
              const diferenca = f.diferenca;
              toast(`Caixa fechado · diferença ${diferenca >= 0 ? '+' : ''}${brl(diferenca)}`);
              desenhar();
            },
          }, 'Fechar caixa'),
        ]),
      ])
    );
  };

  alvo.append(corpo);
  desenhar();
};
