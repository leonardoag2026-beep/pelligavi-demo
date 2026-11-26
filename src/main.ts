import { abrirSessao } from './api/services/rastreio.service.js';
import { el, limpar } from './shared/ui/dom.js';
import { SITE } from './shared/config/site.js';
import { aoMudar } from './api/storage.js';
import { renderLoja } from './pages/loja/loja.js';
import { renderPainel, redesenharPainel } from './pages/painel/painel.js';
import { renderMontar, destruirMontar } from './pages/montar/montar.js';
import { renderPix } from './pages/pix/pix.js';
import { conversas, carregarConversas } from './api/services/crm.service.js';
import { carregarCustos } from './features/painel/custos.js';
import { carregarClientes } from './api/services/clientes.service.js';
import { carregarCaixa } from './api/services/caixa.service.js';
import { carregarConfig } from './api/services/config.service.js';
import { carregarCobrancas } from './api/services/payment.service.js';
import { carregarReembolsos } from './api/services/reembolsos.service.js';
import { garantirDados, carregarPedidos } from './api/services/orders.service.js';
import { classesDoCatalogo, modelosDoCatalogo, carregarCardapio } from './api/services/cardapio.service.js';
import { definirTipos, definirModelos } from './shared/config/ingredientes.js';
import { tokenBase } from './api/services/dispositivo.service.js';
import { carregarSessao, logado } from './api/services/auth.service.js';

// o cardápio vem do banco via API; sem API não existe cardápio de mentira no front
try {
  await carregarConfig();
  await carregarCobrancas();
  await carregarCardapio();
  await carregarSessao();
} catch (erro) {
  const aviso = document.createElement('p');
  aviso.className = 'falha-api';
  aviso.textContent = 'Não foi possível carregar o cardápio do servidor.';
  document.body.appendChild(aviso);
  console.error('[cardapio]', erro);
  throw erro;
}

// dados do painel exigem sessão do gerente no servidor (as rotas respondem 401 sem cookie)
if (logado()) {
  try {
    await carregarReembolsos();
    await carregarConversas();
    await carregarCustos();
    await carregarPedidos();
    await carregarClientes();
    await carregarCaixa();
  } catch (erro) {
    console.error('[painel]', erro);
  }
}

garantirDados();
tokenBase();

const sincronizarCatalogo = () => {
  definirTipos(classesDoCatalogo());
  definirModelos(modelosDoCatalogo());
};
sincronizarCatalogo();
window.addEventListener('focus', sincronizarCatalogo);

const app = document.getElementById('app')!;
const abas = document.getElementById('abas')!;
const params = new URLSearchParams(window.location.search);
const tokenPix = params.get('pix');

const rotaAtual = () => {
  if (window.location.hash === '#painel') return 'painel';
  if (window.location.hash === '#montar') return 'montar';
  return 'loja';
};

if (tokenPix) {
  document.body.classList.add('modo-psp');
  renderPix(app, tokenPix);
} else {
  let rota = rotaAtual();

  const desenharAbas = () => {
    limpar(abas);
    const abertas = conversas().filter((c) => c.status === 'aberta').length;
    abas.append(
      el('div', { class: 'abas-topo__marca' }, [el('span', { class: 'abas-topo__logo' }, SITE.nome), el('span', { class: 'abas-topo__demo' }, 'demo')]),
      el('div', { class: 'abas-topo__botoes' }, [
        el('button', {
          type: 'button', class: `abas-topo__botao ${rota === 'loja' ? 'abas-topo__botao--ativo' : ''}`,
          onclick: () => { window.location.hash = ''; },
        }, 'Loja'),
        el('button', {
          type: 'button', class: `abas-topo__botao ${rota === 'painel' ? 'abas-topo__botao--ativo' : ''}`,
          onclick: () => { window.location.hash = '#painel'; },
        }, [el('span', {}, 'Painel'), abertas ? el('span', { class: 'abas-topo__contador' }, abertas) : null]),
      ])
    );
  };

  const desenhar = () => {
    rota = rotaAtual();
    destruirMontar();
    limpar(app);
    document.body.dataset.rota = rota;
    desenharAbas();
    if (rota === 'loja') renderLoja(app);
    else if (rota === 'painel') renderPainel(app);
    else {
      sincronizarCatalogo();
      renderMontar(app, () => { window.location.hash = ''; });
    }
  };

  window.addEventListener('hashchange', () => {
    desenhar();
    if (rota !== 'montar') window.scrollTo({ top: 0 });
  });

  aoMudar(() => {
    desenharAbas();
    if (rota === 'painel') redesenharPainel();
  });

  desenhar();
}

void abrirSessao();
