import { brl, hora } from '../../shared/format/format.js';
import { el, limpar, toast } from '../../shared/ui/dom.js';
import { links, criarLink, marcarLinkPago, urlDoDemo } from '../../api/services/payment.service.js';
import { atual, aoMudar } from '../../api/storage.js';
import { listar } from '../../api/services/orders.service.js';
import { resumo as resumoCaixa } from '../../api/services/caixa.service.js';

const ROTULO = { pix: 'PIX', dinheiro: 'Dinheiro', cartao: 'Crédito', debito: 'Débito' };

const linkPix = (cobranca: any) => `${urlDoDemo()}?pix=${cobranca.id}`;
const linkPagamento = (code: any) => `https://pay.pelligavi.com.br/l/${code}`;

const copiar = async (texto: any, aviso: any) => {
  try {
    await navigator.clipboard.writeText(texto);
    toast(aviso);
  } catch {
    const campo = el('textarea', { class: 'copia-temp' });
    campo.value = texto;
    document.body.append(campo);
    campo.select();
    document.execCommand('copy');
    campo.remove();
    toast(aviso);
  }
};

export const renderPagamentos = (alvo: any) => {
  const corpo = el('div', { class: 'pagamentos-painel' });

  const desenhar = () => {
    limpar(corpo);
    const estado = atual({ cobrancas: [] as any[], links: [] as any[], reembolsos: [] as any[] });
    const cobrancas = (estado.cobrancas || []).slice(0, 6);
    const lista = links() || [];
    const reembolsos = (estado.reembolsos || []).slice(0, 5);
    const hoje = resumoCaixa();
    const pedidos = listar();
    const emAberto = pedidos
      .filter((p) => !['cancelado', 'reembolsado'].includes(p.status))
      .map((p) => ({ pedido: p, saldo: (p.pagamentos || []).reduce((s, x) => s + x.valor, 0) }))
      .map((x) => ({ ...x, falta: Math.max(0, x.pedido.total - x.saldo) }))
      .filter((x) => x.falta > 0)
      .slice(0, 6);

    const valor = el('input', { class: 'campo', placeholder: '89,90', inputmode: 'decimal' });
    const descricao = el('input', { class: 'campo', placeholder: 'Pedido por telefone — mesa 4' });

    corpo.append(
      el('div', { class: 'kpis' }, [
        el('article', { class: 'kpi kpi--destaque' }, [
          el('span', { class: 'kpi__rotulo' }, 'Recebido no caixa'),
          el('strong', { class: 'kpi__valor' }, brl(hoje.total || 0)),
          el('span', { class: 'kpi__detalhe' }, hoje.aberto ? 'caixa aberto' : 'caixa fechado'),
        ]),
        el('article', { class: 'kpi' }, [
          el('span', { class: 'kpi__rotulo' }, 'A receber'),
          el('strong', { class: 'kpi__valor' }, brl(emAberto.reduce((s, x) => s + x.falta, 0))),
          el('span', { class: 'kpi__detalhe' }, `${emAberto.length} pedidos com saldo`),
        ]),
        el('article', { class: 'kpi' }, [
          el('span', { class: 'kpi__rotulo' }, 'Links gerados'),
          el('strong', { class: 'kpi__valor' }, String(lista.length)),
          el('span', { class: 'kpi__detalhe' }, `${lista.filter((l) => l.status === 'pago').length} pagos`),
        ]),
        el('article', { class: 'kpi' }, [
          el('span', { class: 'kpi__rotulo' }, 'Reembolsos'),
          el('strong', { class: 'kpi__valor negativo' }, `− ${brl(reembolsos.reduce((s, r) => s + r.valor, 0))}`),
          el('span', { class: 'kpi__detalhe' }, `${reembolsos.length} registros`),
        ]),
      ]),

      el('section', { class: 'cartao-painel' }, [
        el('header', { class: 'cartao-painel__topo' }, [el('h2', {}, 'Gerar link de pagamento'), el('span', { class: 'nota' }, 'cobra quem pediu por telefone')]),
        el('div', { class: 'campo-grupo campo-grupo--linha' }, [valor, descricao,
          el('button', {
            type: 'button', class: 'botao botao--primario botao--mini',
            onclick: async () => {
              const centavos = Math.round(Number(String(valor.value).replace(',', '.')) * 100);
              if (!centavos || centavos <= 0) return toast('Informe um valor');
              const link = criarLink({ valor: centavos, descricao: descricao.value.trim() || 'Cobrança no balcão' });
              await copiar(linkPagamento(link.code), `Link ${link.code} criado e copiado.`);
              desenhar();
            },
          }, 'Gerar e copiar'),
        ]),
      ]),

      el('section', { class: 'cartao-painel' }, [
        el('header', { class: 'cartao-painel__topo' }, [el('h2', {}, 'Links de pagamento'), el('span', { class: 'nota' }, 'gerados no painel')]),
        lista.length
          ? el('ul', { class: 'relatorio-lista' }, lista.map((link) =>
              el('li', {}, [
                el('span', {}, `${link.code} · ${link.descricao}`),
                el('strong', {}, brl(link.valor)),
                el('span', { class: `selo ${link.status === 'pago' ? 'selo--entregue' : 'selo--preparo'}` }, link.status === 'pago' ? 'pago' : 'aguardando'),
                el('div', { class: 'pagamentos-painel__acoes' }, [
                  el('button', { type: 'button', class: 'botao botao--mini botao--fantasma', onclick: () => copiar(linkPagamento(link.code), 'Link copiado.') }, 'copiar'),
                  link.status !== 'pago'
                    ? el('button', {
                        type: 'button', class: 'botao botao--mini botao--primario',
                        onclick: () => { marcarLinkPago(link.code); toast('Link marcado como pago'); desenhar(); },
                      }, 'marcar pago')
                    : null,
                ]),
              ])
            ))
          : el('p', { class: 'nota' }, 'Nenhum link ainda. Gere o primeiro acima.'),
      ]),

      el('div', { class: 'painel-grade' }, [
        el('section', { class: 'cartao-painel' }, [
          el('header', { class: 'cartao-painel__topo' }, [el('h2', {}, 'Cobranças PIX do site'), el('span', { class: 'nota' }, 'geradas no checkout')]),
          cobrancas.length
            ? el('ul', { class: 'relatorio-lista' }, cobrancas.map((c) =>
                el('li', {}, [
                  el('span', {}, `${c.cliente?.nome || 'cliente'} · ${hora(c.criadoEm)}`),
                  el('strong', {}, brl(c.valor)),
                  el('span', { class: 'nota' }, c.status),
                  el('div', { class: 'pagamentos-painel__acoes' }, [
                    el('button', { type: 'button', class: 'botao botao--mini botao--fantasma', onclick: () => copiar(linkPix(c), 'Link PIX copiado.') }, 'copiar'),
                  ]),
                ])
              ))
            : el('p', { class: 'nota' }, 'Nenhuma cobrança PIX ainda.'),
        ]),
        el('section', { class: 'cartao-painel' }, [
          el('header', { class: 'cartao-painel__topo' }, [el('h2', {}, 'Pedidos com saldo'), el('span', { class: 'nota' }, 'falta receber')]),
          emAberto.length
            ? el('ul', { class: 'relatorio-lista' }, emAberto.map(({ pedido, falta }) =>
                el('li', {}, [
                  el('span', {}, `${pedido.id} · ${pedido.cliente.nome}`),
                  el('strong', { class: 'negativo' }, brl(falta)),
                  el('span', { class: 'nota' }, pedido.pagamento?.metodo || '—'),
                  el('button', {
                    type: 'button', class: 'botao botao--mini botao--fantasma',
                    onclick: () => { window.location.hash = '#painel'; toast('Abra o pedido na aba Pedidos para registrar'); },
                  }, 'ver'),
                ])
              ))
            : el('p', { class: 'nota' }, 'Todos os pedidos estão quitados.'),
        ]),
      ]),

      el('section', { class: 'cartao-painel' }, [
        el('header', { class: 'cartao-painel__topo' }, [el('h2', {}, 'Reembolsos'), el('span', { class: 'nota' }, 'histórico')]),
        reembolsos.length
          ? el('ul', { class: 'relatorio-lista' }, reembolsos.map((r) =>
              el('li', {}, [
                el('span', {}, `${r.id} · ${r.motivo}`),
                el('strong', { class: 'negativo' }, `− ${brl(r.valor)}`),
                el('span', { class: 'nota' }, hora(r.em)),
              ])
            ))
          : el('p', { class: 'nota' }, 'Nenhum reembolso registrado.'),
      ])
    );
  };

  alvo.append(corpo);
  desenhar();
  aoMudar(desenhar);
};
