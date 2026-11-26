import { el, limpar, toast } from '../../shared/ui/dom.js';
import { SITE } from '../../shared/config/site.js';
import { renderVisao } from '../../features/painel/visao.js';
import { renderNotificacoes } from '../../features/painel/notificacoes.js';
import { renderPedidos } from '../../features/painel/pedidos.js';
import { renderCozinha } from '../../features/painel/cozinha.js';
import { renderCardapio } from '../../features/painel/cardapio.js';
import { renderClientes } from '../../features/painel/clientes.js';
import { renderFuncionarios } from '../../features/painel/funcionarios.js';
import { renderRelatorios } from '../../features/painel/relatorios.js';
import { renderConfig } from '../../features/painel/config.js';
import { renderConversas } from '../../features/painel/conversas.js';
import { renderPagamentos } from '../../features/painel/pagamentos.js';
import { renderTransacoes } from '../../features/painel/transacoes.js';
import { renderCustos } from '../../features/painel/custos.js';
import { renderLogin } from '../../features/painel/login.js';
import { conversas } from '../../api/services/crm.service.js';
import { listar } from '../../api/services/orders.service.js';
import { logado, sair } from '../../api/services/auth.service.js';
import { limpar as limparDados } from '../../api/storage.js';
import { confirmar } from '../../shared/ui/dialogo.js';
import { marca } from '../../shared/ui/marca.js';
import { tocarPedido, desbloquearAudio } from '../../shared/ui/som.js';

const ABAS = [
  { id: 'visao', nome: 'Geral', icone: '◔', render: renderVisao, subtitulo: 'resumo do dia' },
  { id: 'relatorios', nome: 'Análise', icone: '◫', render: renderRelatorios, restrito: true, subtitulo: 'receitas, despesas e metas' },
  { id: 'pagamentos', nome: 'Transações', icone: '◈', render: renderTransacoes, restrito: true, subtitulo: 'receitas, despesas e cobranças' },
  { id: 'cozinha', nome: 'Cozinha', icone: '♨', render: renderCozinha, subtitulo: 'fila de produção, ordem de chegada' },
  { id: 'pedidos', nome: 'Histórico de pedidos', icone: '▤', render: renderPedidos, subtitulo: 'todos os pedidos, com filtros' },
  { id: 'cardapio', nome: 'Cardápio', icone: '☰', render: renderCardapio, restrito: true, subtitulo: 'sabores, bebidas e adicionais' },
  { id: 'clientes', nome: 'Clientes', icone: '☺', render: renderClientes, restrito: true, subtitulo: 'cadastro e anonimização (LGPD)' },
  { id: 'conversas', nome: 'Conversas', icone: '✉', render: renderConversas, subtitulo: 'atendimento por canal' },
  { id: 'funcionarios', nome: 'Funcionários', icone: '☗', render: renderFuncionarios, restrito: true, subtitulo: 'equipe, turnos e salários' },
  { id: 'custos', nome: 'Custos', icone: '▦', render: renderCustos, restrito: true, subtitulo: 'contas mensais, imediatas e periódicas' },
  { id: 'notificacoes', nome: 'Notificações', icone: '◎', render: renderNotificacoes, subtitulo: 'o que aconteceu no painel' },
  { id: 'config', nome: 'Configurações', icone: '⚙', render: renderConfig, restrito: true, subtitulo: 'taxa, descontos e gerente' },
];

let atual = 'visao';
let pararCozinha: any = null;

const conteudo = el('div', { class: 'painel__conteudo' });
const folha = el('div', { class: 'painel__mais' });
const nav = el('nav', { class: 'painel__nav' });
const subtitulo = el('span', { class: 'nota painel__subtitulo' });
const tituloEl = el('h1', {}, 'Geral');
const selo = el('button', { type: 'button', class: 'painel__item painel__item--sair' });

const PRIMARIAS = 4;

const desenharNav = () => {
  limpar(nav);
  const abertas = conversas().filter((c) => c.status === 'aberta').length;
  const naFila = listar().filter((p) => p.status === 'preparo').length;
  const contadorDe = (aba: any) => (aba.id === 'conversas' ? abertas : aba.id === 'cozinha' ? naFila : 0);

  const item = (aba: any, extra = '') => el('button', {
    type: 'button',
    class: `painel__item ${atual === aba.id ? 'painel__item--ativo' : ''} ${extra}`,
    onclick: () => { atual = aba.id; desenhar(); },
  }, [
    el('span', { class: 'painel__item-icone' }, aba.icone),
    el('span', { class: 'painel__item-nome' }, aba.nome),
    contadorDe(aba) ? el('span', { class: 'painel__contador' }, contadorDe(aba)) : null,
  ]);

  const resto = ABAS.slice(PRIMARIAS);

  nav.append(
    ...ABAS.map((aba, indice) => item(aba, indice < PRIMARIAS ? 'painel__item--primaria' : 'painel__item--extra')),
    el('button', {
      type: 'button',
      class: `painel__item painel__item--mais ${resto.some((a) => a.id === atual) ? 'painel__item--ativo' : ''}`,
      onclick: (evento: any) => {
        evento.stopPropagation();
        abrirFolha();
      },
    }, [
      el('span', { class: 'painel__item-icone' }, '⋯'),
      el('span', { class: 'painel__item-nome' }, 'Mais'),
    ]),
    selo
  );
};

const abrirFolha = () => {
  if (!folha) return;
  limpar(folha);
  const abertas = conversas().filter((c) => c.status === 'aberta').length;
  const naFila = listar().filter((p) => p.status === 'preparo').length;
  folha.append(
    el('div', { class: 'painel__mais-topo' }, [
      el('span', { class: 'campo-rotulo' }, 'Mais telas'),
      el('button', { type: 'button', class: 'painel__mais-fechar', onclick: () => fecharFolha() }, '✕'),
    ]),
    el('div', { class: 'painel__mais-lista' }, ABAS.slice(PRIMARIAS).map((aba) => {
      const contador = aba.id === 'conversas' ? abertas : aba.id === 'cozinha' ? naFila : 0;
      return el('button', {
        type: 'button',
        class: `painel__item painel__item--folha ${atual === aba.id ? 'painel__item--ativo' : ''}`,
        onclick: () => { atual = aba.id; fecharFolha(); desenhar(); },
      }, [
        el('span', { class: 'painel__item-icone' }, aba.icone),
        el('span', { class: 'painel__item-nome' }, aba.nome),
        contador ? el('span', { class: 'painel__contador' }, contador) : null,
      ]);
    }))
  );
  folha.append(el('button', {
    type: 'button', class: 'painel__item painel__item--folha painel__item--sair',
    onclick: () => { void sair().then(() => { toast('Sessão encerrada'); window.location.hash = '#painel'; window.dispatchEvent(new HashChangeEvent('hashchange')); }); },
  }, [
    el('span', { class: 'painel__item-icone' }, '⏻'),
    el('span', { class: 'painel__item-nome' }, 'Sair da conta'),
  ]));
  folha.classList.add('painel__mais--aberto');
};

const fecharFolha = () => folha?.classList.remove('painel__mais--aberto');

const desenharSelo = () => {
  limpar(selo);
  if (logado()) {
    selo.classList.add('painel__sessao--on');
    selo.replaceChildren(
      el('span', { class: 'painel__item-icone' }, '⏻'),
      el('span', { class: 'painel__item-nome' }, 'Sair da conta'),
    );
    selo.onclick = () => { void sair().then(() => { toast('Sessão encerrada'); window.location.hash = '#painel'; window.dispatchEvent(new HashChangeEvent('hashchange')); }); };
  } else {
    selo.classList.remove('painel__sessao--on');
    selo.replaceChildren(
      el('span', { class: 'painel__item-icone' }, '⏻'),
      el('span', { class: 'painel__item-nome' }, 'Entrar como gerente'),
    );
    selo.onclick = () => { atual = 'login'; desenhar(); };
  }
};

const desenhar = () => {
  fecharFolha();
  if (pararCozinha) {
    try { pararCozinha(); } catch { void 0; }
    pararCozinha = null;
  }
  desenharNav();
  desenharSelo();
  limpar(conteudo);

  if (atual === 'login') {
    tituloEl.textContent = 'Entrar';
    subtitulo.textContent = 'acesso do gerente';
    renderLogin(conteudo, { aoEntrar: () => { atual = 'pedidos'; desenhar(); }, aoCancelar: () => { atual = 'pedidos'; desenhar(); } });
    return;
  }

  const aba = ABAS.find((a) => a.id === atual) || ABAS[0];
  tituloEl.textContent = aba.nome;
  subtitulo.textContent = aba.subtitulo || '';

  const retorno = aba.render(conteudo, { aoSair: () => { atual = 'pedidos'; desenhar(); } });
  if (aba.id === 'cozinha' && typeof retorno === 'function') pararCozinha = retorno;
};

let vigia: any = null;
let conhecidos = new Set();

const iniciarVigia = () => {
  if (vigia) clearInterval(vigia);
  conhecidos = new Set(listar().map((p) => p.numero));
  vigia = setInterval(() => {
    const atuais = listar();
    const recemChegados = atuais.filter((p) => !conhecidos.has(p.numero));
    if (!recemChegados.length) return;
    conhecidos = new Set(atuais.map((p) => p.numero));
    tocarPedido();
    toast(recemChegados.length === 1 ? `Pedido ${recemChegados[0].id} chegou` : `${recemChegados.length} pedidos chegaram`);
    desenhar();
  }, 2500);
};

const montarPainel = (alvo: any) => {
  limpar(alvo);
  alvo.append(
    el('div', { class: 'painel' }, [
      el('aside', { class: 'painel__lateral' }, [
        el('div', { class: 'painel__marca' }, marca({ horizontal: true })),
        nav,
        el('button', {
          type: 'button', class: 'painel__reiniciar',
          onclick: async () => {
            const ok = await confirmar({ titulo: 'Reiniciar demo', texto: 'Zerar o demo e voltar aos pedidos de exemplo?', rotuloOk: 'Reiniciar' });
            if (!ok) return;
            limparDados();
            atual = 'pedidos';
            desenhar();
          },
        }, '↺ Reiniciar demo'),
      ]),
      el('main', { class: 'painel__principal' }, [
        el('header', { class: 'painel__topo' }, [
          el('div', { class: 'painel__titulo' }, [tituloEl, subtitulo]),
          el('div', { class: 'painel__topo-dir' }),
        ]),
        conteudo,
      ]),
      folha,
    ])
  );
  desenhar();
  iniciarVigia();
  document.addEventListener('pointerdown', desbloquearAudio, { once: true });
  return { redesenhar: desenhar, desenhar };
};

const montarLogin = (alvo: any) => {
  limpar(alvo);
  const caixa = el('div', { class: 'painel-login' });
  alvo.append(caixa);
  renderLogin(caixa, { aoEntrar: () => montarPainel(alvo) });
};

export const renderPainel = (alvo: any) => {
  if (!logado()) {
    montarLogin(alvo);
    return { redesenhar: () => (logado() ? montarPainel(alvo) : montarLogin(alvo)) };
  }
  return montarPainel(alvo);
};

export const redesenharPainel = desenhar;
