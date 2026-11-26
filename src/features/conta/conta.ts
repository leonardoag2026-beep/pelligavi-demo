import { brl, hora } from '../../shared/format/format.js';
import { el, modal, toast, limpar } from '../../shared/ui/dom.js';
import { contaAtual, entrar, cadastrar, sair, identificadorValido } from '../../api/services/account.service.js';
import { porConta, porDispositivo, adotarDoDispositivo, avancar } from '../../api/services/orders.service.js';
import { pedidosDaSessao } from '../../api/services/rastreio.service.js';
import { tokenBase } from '../../api/services/dispositivo.service.js';
import { STATUS_PEDIDO } from '../../shared/config/site.js';
import { abrirAuth } from './auth.js';

const ETAPAS = {
  entrega: ['recebido', 'preparo', 'rota', 'entregue'],
  retirada: ['recebido', 'preparo', 'pronto', 'retirado'],
};

const ATIVOS = ['novo', 'preparo', 'pronto', 'rota'];

const NOME: Record<string, string> = {
  recebido: 'Pedido Recebido',
  preparo: 'Em Preparo',
  pronto: 'Pronto para Retirada',
  rota: 'Saiu para Entrega',
  entregue: 'Pedido Entregue',
  retirado: 'Pedido Retirado',
};

const DESCRICAO: Record<string, string> = {
  recebido: 'Confirmado no sistema',
  preparo: 'Montando e assando a pizza',
  pronto: 'Esperando você no balcão',
  rota: 'A caminho do endereço',
  entregue: 'Finalização ao chegar no destino',
  retirado: 'Retirado no balcão',
};

const ESPERA: Record<string, string> = {
  recebido: 'Aguardando confirmação do pedido',
  preparo: 'Aguardando a cozinha começar',
  pronto: 'Aguardando conclusão do preparo',
  rota: 'Aguardando conclusão do preparo',
  entregue: 'Finalização ao chegar no destino',
  retirado: 'Aguardando a retirada no balcão',
};

const GLIFO: Record<string, string> = {
  recebido: '✓',
  preparo: '♨',
  pronto: '♨',
  rota: '→',
  entregue: '✓',
  retirado: '✓',
};

const ARTE_PIZZA = `<svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true">
  <path d="M9.5 15.5C19 11 29 11 38.5 15.5L24 41 9.5 15.5Z" fill="currentColor"/>
  <circle cx="19" cy="22" r="2.7" fill="var(--verde)"/><circle cx="28" cy="27" r="2.3" fill="var(--verde)"/>
  <circle cx="28" cy="19" r="1.9" fill="var(--verde)"/>
</svg>`;

const ARTE_CONTA = `<svg viewBox="0 0 48 48" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14 7h20v34l-4-3-4 3-4-3-4 3-4-3V7Z"/><path d="M19 16h10M19 23h10M19 30h6"/>
</svg>`;

const ehPizza = (pedido: any) => pedido.itens.some((i: any) => /margherita|calabresa|portuguesa|pepperoni|quatro|horta|frango|mussarela|napolitana/i.test(i.nome || ''));

const etapasDe = (pedido: any) => ETAPAS[pedido.tipo === 'retirada' ? 'retirada' : 'entrega'];
const momento = (pedido: any, id: any) => (pedido.historico || []).find((h: any) => h.status === id);

const posicaoAtual = (pedido: any, etapas: any) => {
  if (pedido.status === 'novo') return 0;
  const direto = etapas.indexOf(pedido.status);
  if (direto >= 0) return direto;
  if (pedido.status === 'pronto' && etapas.includes('rota')) return etapas.indexOf('preparo');
  return -1;
};

const notaDaEtapa = (pedido: any, id: any, padrao: any) =>
  pedido.status === 'pronto' && id === 'preparo' && etapasDe(pedido).includes('rota')
    ? 'Pronta, aguardando o entregador'
    : padrao;

const acompanhamento = (pedido: any) => {
  const etapas = etapasDe(pedido);
  const atual = posicaoAtual(pedido, etapas);
  const morto = ['cancelado', 'reembolsado'].includes(pedido.status);
  return el('ol', { class: 'acompanhamento' }, etapas.map((id, i) => {
    const feito = !morto && atual > i;
    const agora = !morto && atual === i;
    const h = momento(pedido, id);
    const nota = h ? `${hora(h.em)} · ${DESCRICAO[id]}` : (feito || agora ? DESCRICAO[id] : ESPERA[id]);
    return el('li', { class: `acompanhamento__passo ${feito ? 'acompanhamento__passo--feito' : ''} ${agora ? 'acompanhamento__passo--agora' : ''} ${morto ? 'acompanhamento__passo--parado' : ''}` }, [
      el('span', { class: 'acompanhamento__bolha' }, feito ? '✓' : GLIFO[id]),
      el('div', { class: 'acompanhamento__texto' }, [
        el('div', { class: 'acompanhamento__titulo' }, [
          el('strong', {}, NOME[id]),
          agora ? el('span', { class: 'acompanhamento__atual' }, 'Atual') : null,
        ]),
        el('span', { class: 'acompanhamento__nota' }, notaDaEtapa(pedido, id, nota)),
      ]),
    ]);
  }));
};

const itemLinha = (pedido: any, aoAbrir: any) => {
  const primeiro = pedido.itens[0] || { qtd: 1, nome: 'Pedido' };
  const extra = pedido.itens.length > 1 ? ` +${pedido.itens.length - 1}` : '';
  return el('button', { type: 'button', class: 'pedido-item', onclick: aoAbrir }, [
    el('span', { class: 'pedido-item__arte', html: ehPizza(pedido) ? ARTE_PIZZA : ARTE_CONTA }),
    el('span', { class: 'pedido-item__texto' }, [
      el('span', { class: 'pedido-item__topo' }, [
        el('strong', {}, `${pedido.id.replace('PLG-', '#')} - ${primeiro.qtd}× ${primeiro.nome}${extra}`),
        el('span', { class: `selo selo--${pedido.status}` }, STATUS_PEDIDO[pedido.status]?.nome || pedido.status),
      ]),
      el('span', { class: 'pedido-item__sub' }, pedido.tipo === 'retirada'
        ? `Cliente: ${pedido.cliente.nome} (Retirada)`
        : `Cliente: ${pedido.cliente.nome} (Delivery)`),
    ]),
    el('span', { class: 'pedido-item__seta' }, '›'),
  ]);
};

const secao = (titulo: any, pedidos: any, vazio: any, abrir: any) => el('section', { class: 'conta__secao' }, [
  el('span', { class: 'campo-rotulo' }, titulo),
  pedidos.length
    ? el('div', { class: 'conta__lista' }, pedidos.map((p: any) => itemLinha(p, () => abrir(p.numero))))
    : el('p', { class: 'nota' }, vazio),
]);

const ficha = (pedido: any, { aoVoltar, aoAvancar }: { aoVoltar: () => void; aoAvancar: () => void }) => {
  const morto = ['cancelado', 'reembolsado'].includes(pedido.status);
  const proximo = STATUS_PEDIDO[pedido.status]?.proximo;
  return el('div', { class: 'conta__ficha' }, [
    el('button', { type: 'button', class: 'conta__voltar', onclick: aoVoltar }, ['‹', el('span', {}, 'Pedidos')]),
    el('article', { class: 'pedido-status' }, [
      el('div', { class: 'pedido-status__resumo' }, [
        el('strong', { class: 'pedido-status__numero' }, `Pedido #${pedido.numero}`),
        el('span', { class: 'pedido-status__cliente' }, `Cliente: ${pedido.cliente.nome} • ${pedido.tipo === 'retirada' ? 'Retirada' : 'Delivery'}`),
        el('ul', { class: 'pedido-status__itens' }, pedido.itens.map((i: any) =>
          el('li', {}, [
            el('strong', {}, `${i.qtd}× ${i.nome}`),
            el('span', {}, ` (${brl(i.preco * i.qtd)})`),
          ])
        )),
        pedido.observacao ? el('p', { class: 'pedido-status__obs' }, `Obs: ${pedido.observacao}`) : null,
      ]),
      el('h3', { class: 'pedido-status__titulo' }, 'Acompanhamento do Status'),
      acompanhamento(pedido),
      morto
        ? el('p', { class: 'pedido-status__aviso' }, `Pedido ${STATUS_PEDIDO[pedido.status].nome.toLowerCase()}${pedido.motivoCancelamento ? ` · ${pedido.motivoCancelamento}` : ''}.`)
        : null,
      !morto && proximo
        ? el('button', { type: 'button', class: 'botao botao--primario botao--largo pedido-status__acao', onclick: aoAvancar }, 'Avançar status')
        : null,
    ]),
  ]);
};

export const abrirConta = (aoAtualizar: any) => {
  if (!contaAtual()) {
    return abrirAuth({ aoAtualizar });
  }
  const corpo = el('div', { class: 'conta' });
  const vista = { tela: 'lista', numero: null };

  const desenhar = () => {
    limpar(corpo);
    const conta = contaAtual();

    if (conta) {
      adotarDoDispositivo(conta.id, tokenBase());
      const meus = porConta(conta.id);
      const doNavegador = porDispositivo(tokenBase()).filter((p) => !meus.some((m) => m.numero === p.numero));
      const pedidos = [...meus, ...doNavegador];
      if (vista.tela === 'detalhe') {
        const pedido = pedidos.find((p) => p.numero === vista.numero);
        if (pedido) {
          corpo.append(ficha(pedido, {
            aoVoltar: () => { vista.tela = 'lista'; desenhar(); },
            aoAvancar: () => {
              avancar(pedido.numero);
              toast(`${pedido.id} → ${STATUS_PEDIDO[STATUS_PEDIDO[pedido.status]?.proximo || '']?.nome.toLowerCase() || 'atualizado'}`);
              desenhar();
            },
          }));
          return;
        }
        vista.tela = 'lista';
      }

      const ativos = pedidos.filter((p) => ATIVOS.includes(p.status));
      const anteriores = pedidos.filter((p) => !ATIVOS.includes(p.status));
      const abrir = (numero: any) => { vista.tela = 'detalhe'; vista.numero = numero; desenhar(); };

      corpo.append(
        el('div', { class: 'conta__topo' }, [
          el('div', { class: 'conta__identidade' }, [
            el('span', { class: 'conta__avatar' }, conta.nome.trim().charAt(0).toUpperCase()),
            el('div', {}, [el('strong', {}, conta.nome), el('span', { class: 'nota' }, conta.identificador)]),
          ]),
          el('button', {
            type: 'button', class: 'botao botao--mini botao--fantasma',
            onclick: async () => { await sair(); aoAtualizar?.(); desenhar(); },
          }, 'Sair'),
        ]),
        secao('Pedidos ativos', ativos, 'Nenhum pedido em andamento agora.', abrir),
        secao('Pedidos anteriores', anteriores, 'Seus pedidos entregues aparecem aqui.', abrir)
      );
      return;
    }

    const estado = { modo: 'entrar', nome: '', identificador: '', senha: '' };
    const erro = el('p', { class: 'erro-linha' });
    const form = el('div', { class: 'conta__form' });

    const desenharForm = () => {
      limpar(form);
      form.append(
        el('div', { class: 'abas' }, [
          el('button', { type: 'button', class: `aba ${estado.modo === 'entrar' ? 'aba--ativa' : ''}`, onclick: () => { estado.modo = 'entrar'; desenharForm(); } }, 'Entrar'),
          el('button', { type: 'button', class: `aba ${estado.modo === 'criar' ? 'aba--ativa' : ''}`, onclick: () => { estado.modo = 'criar'; desenharForm(); } }, 'Criar conta'),
        ]),
        estado.modo === 'criar'
          ? el('label', { class: 'campo-bloco' }, [
              el('span', { class: 'campo-rotulo' }, 'Nome'),
              el('input', { class: 'campo', value: estado.nome, placeholder: 'Maria Souza', oninput: (e: any) => { estado.nome = e.target.value; } }),
            ])
          : '',
        el('label', { class: 'campo-bloco' }, [
          el('span', { class: 'campo-rotulo' }, 'E-mail ou celular'),
          el('input', { class: 'campo', value: estado.identificador, placeholder: 'voce@email.com', oninput: (e: any) => { estado.identificador = e.target.value; } }),
        ]),
        el('label', { class: 'campo-bloco' }, [
          el('span', { class: 'campo-rotulo' }, 'Senha'),
          el('input', {
            class: 'campo', type: 'password', value: estado.senha, placeholder: 'mínimo 6',
            oninput: (e: any) => { estado.senha = e.target.value; },
          }),
        ]),
        erro,
        el('button', {
          type: 'button', class: 'botao botao--primario botao--largo',
          onclick: async () => {
            erro.textContent = '';
            if (estado.modo === 'criar') {
              if (estado.nome.trim().length < 3) { erro.textContent = 'Informe o nome.'; return; }
              if (!identificadorValido(estado.identificador)) { erro.textContent = 'E-mail ou celular com DDD.'; return; }
              if (estado.senha.length < 6) { erro.textContent = 'Senha de pelo menos 6 caracteres.'; return; }
              const r = await cadastrar(estado);
              if (!r.ok) { erro.textContent = r.erro || 'Não foi possível entrar'; return; }
              toast('Conta criada.');
            } else {
              const r = await entrar(estado);
              if (!r.ok) { erro.textContent = r.erro || 'Não foi possível entrar'; return; }
              toast('Bem-vindo de volta.');
            }
            aoAtualizar?.();
            desenhar();
          },
        }, estado.modo === 'criar' ? 'Criar conta' : 'Entrar'),
        estado.modo === 'entrar'
          ? el('button', {
              type: 'button', class: 'botao botao--fantasma botao--largo',
              onclick: async () => {
                const r = await entrar({ identificador: 'mariana@email.com', senha: '123456' });
                if (!r.ok) { erro.textContent = 'Conta de exemplo indisponível — reinicie o demo.'; return; }
                toast('Bem-vindo de volta.');
                aoAtualizar?.();
                desenhar();
              },
            }, 'Entrar na conta de exemplo')
          : '',
        el('p', { class: 'nota' }, 'A conta guarda seus pedidos e o endereço usado no checkout. Comprar sem entrar continua funcionando.')
      );
    };

    desenharForm();
    corpo.append(form);
  };

  desenhar();
  modal({ titulo: 'Minha conta', corpo, largura: 'padrao', tema: 'escuro' });
};

const ETAPAS_DISPOSITIVO: Record<string, string[]> = {
  entrega: ['recebido', 'preparo', 'rota', 'entregue'],
  retirada: ['recebido', 'preparo', 'pronto', 'retirado'],
};

export const abrirPedidosDoDispositivo = (aoAtualizar?: any) => {
  if (contaAtual()) {
    abrirConta(aoAtualizar);
    return;
  }
  const corpo = el('div', { class: 'pedidos-dispositivo' });
  const instancia = modal({ titulo: 'Meus pedidos', corpo, largura: 'padrao', tema: 'escuro' });

  const desenhar = async () => {
    const token = tokenBase();
    let lista: any[] = porDispositivo(token);
    if (!lista.length) {
      const doServidor = await pedidosDaSessao();
      if (doServidor && doServidor.length) lista = doServidor;
    }
    limpar(corpo);
    const rodape = el('div', { class: 'pedidos-dispositivo__rodape' }, [
      el('span', { class: 'nota' }, `token ${token.slice(0, 12)}…`),
    ]);

    if (!lista.length) {
      corpo.append(
        el('p', { class: 'nota' }, 'Nenhum pedido saiu deste navegador ainda.'),
        el('p', { class: 'nota' }, 'Ao concluir um pedido ele aparece aqui na hora — sem precisar entrar.'),
        rodape
      );
      return;
    }
    corpo.append(
      el('p', { class: 'nota' }, 'Pedidos ligados a este navegador.'),
      el('ul', { class: 'pedidos-dispositivo__lista' },
        lista.map((pedido: any) => {
          const estagios = ETAPAS_DISPOSITIVO[pedido.tipo === 'retirada' ? 'retirada' : 'entrega'];
          const atual = pedido.status === 'novo' ? 'recebido' : pedido.status;
          const posicao = Math.max(0, estagios.indexOf(atual));
          const total = typeof pedido.total === 'number' ? pedido.total : 0;
          return el('li', { class: 'pedidos-dispositivo__item' }, [
            el('div', { class: 'pedidos-dispositivo__topo' }, [
              el('strong', {}, pedido.id),
              el('span', { class: 'pedidos-dispositivo__status' }, STATUS_PEDIDO[pedido.status]?.nome || atual),
            ]),
            el('div', { class: 'pedidos-dispositivo__trilha' },
              estagios.map((estagio, indice) =>
                el('span', {
                  class: `pedidos-dispositivo__bolha${indice <= posicao ? ' pedidos-dispositivo__bolha--feita' : ''}`,
                  title: estagio,
                })
              )
            ),
            el('div', { class: 'pedidos-dispositivo__rodape' }, [
              el('span', { class: 'nota' }, `${brl(total)} · ${pedido.tipo === 'retirada' ? 'retirada' : 'entrega'}`),
            ]),
          ]);
        })
      ),
      rodape
    );
  };
  void desenhar();
  return instancia;
};
