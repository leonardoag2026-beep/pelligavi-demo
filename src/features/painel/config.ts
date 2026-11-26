import { el, limpar, toast } from '../../shared/ui/dom.js';
import { pedirCampos } from '../../shared/ui/dialogo.js';
import { brl } from '../../shared/format/format.js';
import { config, definirConfig } from '../../api/services/config.service.js';

// valores de fábrica: restaurar volta ao que o banco entrega no primeiro boot
const PADRAO = {
  taxaBase: 890,
  metaFaturamento: 2000000,
  faixas: [
    { minimo: 8000, percentual: 5 },
    { minimo: 12000, percentual: 10 },
  ],
};
import { trocarSenha, sair, sessao } from '../../api/services/auth.service.js';
import { salvar } from '../../api/storage.js';

export const renderConfig = (alvo: any, { aoSair }: { aoSair?: () => void } = {}) => {
  const corpo = el('div', { class: 'config' });

  const desenhar = () => {
    limpar(corpo);
    const c = config();

    const campoTaxa = el('input', {
      class: 'campo campo--preco', type: 'number', min: '0', step: '0.5',
      value: (c.taxaBase / 100).toFixed(2),
      onchange: (e: any) => { definirConfig({ taxaBase: Math.round(Number(e.target.value) * 100) }); toast('Taxa de entrega atualizada'); },
    });

    corpo.append(
      el('section', { class: 'cartao-painel' }, [
        el('header', { class: 'cartao-painel__topo' }, [el('h2', {}, 'Taxa de entrega'), el('span', { class: 'nota' }, 'aplicada a pedidos de entrega')]),
        el('label', { class: 'campo-grupo campo-grupo--linha' }, [el('span', { class: 'campo-rotulo' }, 'Valor base'), campoTaxa]),
      ]),
      el('section', { class: 'cartao-painel' }, [
        el('header', { class: 'cartao-painel__topo' }, [el('h2', {}, 'Faixas de desconto'), el('span', { class: 'nota' }, 'percentual por valor do pedido')]),
        el('ul', { class: 'relatorio-lista' }, c.faixas.map((f) =>
          el('li', {}, [
            el('span', {}, `acima de ${brl(f.minimo)}`),
            el('strong', {}, `${f.percentual}%`),
            el('button', {
              type: 'button', class: 'botao botao--discreto botao--mini',
              onclick: async () => {
                definirConfig({ faixas: c.faixas.filter((x) => x.minimo !== f.minimo) });
                toast('Faixa removida');
                desenhar();
              },
            }, 'remover'),
          ])
        )),
        el('button', {
          type: 'button', class: 'botao botao--fantasma botao--mini',
          onclick: async () => {
            const resp = await pedirCampos({ titulo: 'Nova faixa de desconto', campos: [
              { chave: 'minimo', rotulo: 'A partir de (R$)', tipo: 'number' },
              { chave: 'percentual', rotulo: 'Percentual (%)', tipo: 'number' },
            ], rotuloOk: 'Adicionar' });
            if (!resp) return;
            const minimo = Number(resp.minimo || 0);
            const percentual = Number(resp.percentual || 0);
            if (!minimo || !percentual) return;
            definirConfig({ faixas: [...c.faixas, { minimo: Math.round(minimo * 100), percentual }] });
            toast('Faixa adicionada');
            desenhar();
          },
        }, '+ Nova faixa'),
      ]),
      el('section', { class: 'cartao-painel' }, [
        el('header', { class: 'cartao-painel__topo' }, [el('h2', {}, 'Gerente'), el('span', { class: 'nota' }, sessao()?.email || '')]),
        el('div', { class: 'pedido-detalhe__acoes' }, [
          el('button', {
            type: 'button', class: 'botao botao--fantasma botao--mini',
            onclick: async () => {
              const senhaResp = await pedirCampos({ titulo: 'Trocar senha', campos: [
                { chave: 'atual', rotulo: 'Senha atual', tipo: 'password' },
                { chave: 'nova', rotulo: 'Nova senha (mínimo 6)', tipo: 'password' },
              ], rotuloOk: 'Trocar' });
              if (!senhaResp) return;
              const atual = senhaResp.atual;
              if (!atual) return;
              const nova = senhaResp.nova;
              if (!nova) return;
              try {
                await trocarSenha(atual, nova);
                toast('Senha alterada');
              } catch (e) {
                toast(e instanceof Error ? e.message : String(e));
              }
            },
          }, 'Trocar senha'),
          el('button', {
            type: 'button', class: 'botao botao--discreto botao--mini',
            onclick: async () => { await sair(); toast('Sessão encerrada'); aoSair?.(); },
          }, 'Sair'),
        ]),
      ]),
      el('section', { class: 'cartao-painel' }, [
        el('header', { class: 'cartao-painel__topo' }, [el('h2', {}, 'Teste de desempenho'), el('span', { class: 'nota' }, 'RNF05 · 1.000 pedidos')]),
        el('p', { class: 'nota' }, 'Gera 1.000 pedidos de exemplo para medir o tempo de resposta das listagens.'),
        el('button', {
          type: 'button', class: 'botao botao--fantasma botao--mini',
          onclick: async () => {
            const inicio = performance.now();
            salvar((estado) => {
              const pedidos = [...(estado.pedidos || [])];
              let numero = estado.proximoNumero || 1041;
              const canais = ['site', 'whatsapp', 'ifood', '99food'];
              for (let i = 0; i < 1000; i += 1) {
                const total = 3500 + Math.floor(Math.random() * 9000);
                pedidos.unshift({
                  id: `PLG-${numero}`,
                  numero,
                  canal: canais[i % canais.length],
                  cliente: { nome: `Cliente carga ${i}`, telefone: null },
                  endereco: 'Rua de teste, 100',
                  itens: [{ nome: 'Margherita', detalhe: 'média', qtd: 1, preco: total }],
                  subtotal: total, taxa: 0, desconto: 0, total,
                  status: 'entregue',
                  tipo: 'entrega',
                  pagamento: { metodo: 'pix', status: 'pago' },
                  pagamentos: [{ metodo: 'pix', valor: total, em: Date.now() - i * 60000 }],
                  historico: [{ status: 'recebido', em: Date.now() - i * 60000 }],
                  criadoEm: Date.now() - i * 60000,
                  contaId: null,
                });
                numero += 1;
              }
              return { ...estado, proximoNumero: numero, pedidos };
            });
            toast(`1.000 pedidos gerados em ${Math.round(performance.now() - inicio)} ms`);
            desenhar();
          },
        }, 'Gerar 1.000 pedidos'),
        el('button', {
          type: 'button', class: 'botao botao--discreto botao--mini',
          onclick: async () => { await definirConfig(PADRAO); toast('Configurações restauradas'); desenhar(); },
        }, 'Restaurar padrões'),
      ])
    );
  };

  alvo.append(corpo);
  desenhar();
};
