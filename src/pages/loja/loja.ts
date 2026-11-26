import { SITE } from '../../shared/config/site.js';
import { EXTRAS } from '../../api/services/menu.service.js';
import { brl } from '../../shared/format/format.js';
import { el, limpar } from '../../shared/ui/dom.js';
import { abrirConta, abrirPedidosDoDispositivo } from '../../features/conta/conta.js';
import { contaAtual } from '../../api/services/account.service.js';
import { pizzaArt } from '../../shared/ui/art.js';
import { marca } from '../../shared/ui/marca.js';

const areaConta = el('div', { class: 'topo__conta' });

let forjaHero = null;
const abrirEstudio = () => {
  window.location.hash = '#montar';
};

const atualizarTopo = () => {
  limpar(areaConta);
  const conta = contaAtual();
  areaConta.append(
    el('button', {
      type: 'button', class: 'botao botao--vidro botao--mini',
      onclick: () => abrirPedidosDoDispositivo(() => atualizarTopo()),
    }, 'Pedidos'),
    el('button', {
      type: 'button', class: 'botao botao--vidro botao--mini',
      onclick: () => abrirConta(() => atualizarTopo()),
    }, conta ? `Olá, ${conta.nome.split(' ')[0]}` : 'Entrar')
  );
};

const passos = [
  ['01', 'Escolha a massa', 'Tradicional de fermentação natural, 48 horas de descanso.'],
  ['02', 'Monte por cima', 'Borda recheada e até quatro adicionais — sem lista fechada.'],
  ['03', 'Pague e acompanhe', 'PIX no QR ou cartão. O forno acende e o pedido cai no painel.'],
];

export const renderLoja = (alvo: any) => {
  alvo.append(
    el('header', { class: 'topo' }, [
      el('div', { class: 'topo__marca' }, [
        marca({ horizontal: true }),
        el('span', { class: 'topo__selo' }, [el('span', { class: 'ponto-verde' }), `${SITE.aberto}`]),
      ]),
      el('div', { class: 'topo__acoes' }, [
        areaConta,
      ]),
    ]),
    el('section', { class: 'hero' }, [
      el('div', { class: 'hero__texto' }, [
        el('p', { class: 'hero__sobre' }, 'Napolitana de fermentação natural · forno a lenha'),
        el('h1', {}, ['A sua pizza', el('br'), el('em', {}, 'não está no cardápio.')]),
        el('div', { class: 'hero__acoes' }, [
          el('button', { type: 'button', class: 'botao botao--primario botao--grande', onclick: () => abrirEstudio() }, 'Montar a minha pizza'),
          el('span', { class: 'hero__dica' }, `entrega ${SITE.tempoEntrega} · frete grátis acima de R$ 90`),
        ]),
        el('p', { class: 'hero__raio' }, [
          el('span', { class: 'hero__raio-ponto' }),
          `Entregamos em até ${SITE.raioEntregaKm} km da pizzaria`,
        ]),
      ]),
      el('div', { class: 'hero__arte' }, [
        el('div', { class: 'hero__palco' }, [
          el('canvas', { class: 'hero__canvas' }),
          el('div', { class: 'hero__fallback', html: pizzaArt(['mussarela', 'pepperoni', 'basilico', 'mussarela', 'pepperoni'], 21) }),
        ]),
        el('span', { class: 'hero__etiqueta' }, 'arraste para girar'),
      ]),
    ]),
    el('section', { class: 'faixa' }, [
      el('span', {}, 'massa de 48 h'),
      el('span', {}, 'forno a 480 °C'),
      el('span', {}, 'mussarela de búfala'),
      el('span', {}, 'tomate italiano'),
      el('span', {}, 'farinha tipo 00'),
    ]),
    el('section', { class: 'passos-loja' }, [
      el('header', { class: 'secao__topo' }, [
        el('h2', {}, 'Como funciona'),
        el('span', { class: 'secao__nota' }, 'três passos, nenhum aplicativo'),
      ]),
      el('div', { class: 'passos-grade' }, passos.map(([n, titulo]) =>
        el('article', { class: 'passo-card' }, [
          el('span', { class: 'passo-card__numero' }, n),
          el('h3', {}, titulo),
        ])
      )),
    ]),
    el('footer', { class: 'rodape' }, [
      el('div', { class: 'rodape__marca' }, [marca(), el('p', { class: 'nota' }, `${SITE.endereco} · ${SITE.cidade}`)]),
      el('div', { class: 'rodape__colunas' }, [
        el('div', {}, [el('span', { class: 'nota' }, 'Horário'), el('p', {}, 'Ter a dom · 18h às 23h30')]),
        el('div', {}, [el('span', { class: 'nota' }, 'Contato'), el('p', {}, SITE.telefone)]),
        el('div', {}, [el('span', { class: 'nota' }, 'Entrega'), el('p', {}, 'Vila Madalena, Pinheiros e Sumaré')]),
      ]),
      el('p', { class: 'nota nota--rodape' }, 'Demonstração: nada é cobrado de verdade e os pedidos ficam salvos no banco da demonstração.'),
    ])
  );

  atualizarTopo();

  const palco = alvo.querySelector('.hero__palco');
  const canvas = alvo.querySelector('.hero__canvas');
  import('../../shared/lib/pizza3d.js')
    .then(({ criarForja }) => criarForja(canvas, {
      partes: 1,
      secoes: [[
        { nome: 'mussarela', qtd: 4 },
        { nome: 'pepperoni', qtd: 7 },
        { nome: 'basilico', qtd: 4 },
        { nome: 'cebola', qtd: 3 },
      ]],
      tamanhoId: 'm',
      bordaId: 'tradicional',
      girar: false,
    }))
    .then((instancia) => {
      if (!instancia) return;
      if (!document.body.contains(canvas)) {
        instancia.destruir();
        return;
      }
      forjaHero = instancia;
      palco.classList.add('tem-3d');
    })
    .catch(() => void 0);
};
