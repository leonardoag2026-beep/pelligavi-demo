import { TAMANHOS, BORDAS, EXTRAS, MONTAGEM, tamanho, borda, extra, pecasDe, extrasDoCatalogo } from '../../api/services/menu.service.js';
import { brl } from '../../shared/format/format.js';
import { SITE } from '../../shared/config/site.js';
import { el, limpar, toast } from '../../shared/ui/dom.js';
import { pizzaArt } from '../../shared/ui/art.js';
import { miniatura } from '../../shared/ui/miniaturas.js';
import { rascunho } from '../pedido/rascunho.js';
import { saboresAtivos, precoSabor, sabor as saborDe } from '../../api/services/cardapio.service.js';
import {
  renderEtapa,
  renderConcluido,
  pararRastreio,
  iniciarEtapas,
  reiniciarEtapas,
  validarDados,
  validarEntrega,
  criarContaSeQuiser,
} from '../checkout/etapas.js';
import { guardarPedido } from '../../api/services/rastreio.service.js';
import { porNumero } from '../../api/services/orders.service.js';

interface ItemSecao {
  id: string;
  porcoes: number;
}

interface EstadoMontagem {
  passo: number;
  tamanhoId: string;
  partes: number;
  secoes: ItemSecao[][];
  saboresSecao: (string | null)[];
  bordaId: string;
  ativa: number;
}

const estado: EstadoMontagem = {
  passo: 1,
  tamanhoId: 'm',
  partes: 1,
  secoes: [[]],
  saboresSecao: [null],
  bordaId: 'tradicional',
  ativa: 0,
};

const PASSOS = [
  { id: 1, nome: 'Tamanho', dica: 'quantas pessoas e quantos sabores' },
  { id: 2, nome: 'Ingredientes', dica: 'o que vai em cada parte' },
  { id: 3, nome: 'Borda', dica: 'o que fecha a pizza' },
  { id: 4, nome: 'Revisar', dica: 'confira antes de fechar' },
  { id: 5, nome: 'Acompanhamentos', dica: 'bebida para acompanhar a pizza' },
  { id: 6, nome: 'Seus dados', dica: 'quem recebe e onde' },
  { id: 7, nome: 'Pagamento', dica: 'PIX, cartão ou dinheiro' },
  { id: 8, nome: 'Concluído', dica: 'acompanhe o status do pedido' },
];

let forja: any = null;
let carregando: any = null;
let pedidoConcluido: { id: any; numero: number; tipo: string; pedido?: any } | null = null;
let despachar: (() => void) | null = null;
let recarregarPalco: (() => void) | null = null;
let raiz: any = null;

export const abrirCheckoutNoEstudio = () => {
  estado.passo = 5;
};

const porcoesDa = (secao: any) => secao.reduce((s: any, item: any) => s + item.porcoes, 0);

const fatorParte = () => 1 / estado.partes;
const gramasDe = (x: any) => Math.max(1, Math.round(x.gramas * fatorParte()));
const precoDe = (x: any) => Math.max(1, Math.round(x.preco * fatorParte()));

const baseMontagem = () => Math.round(MONTAGEM.preco * tamanho(estado.tamanhoId).fator);

const saboresEscolhidos = () =>
  (estado.saboresSecao || []).map((id, i) => (id ? { id, indice: i } : null)).filter(Boolean);

const precoBase = () => {
  const escolhidos = saboresEscolhidos();
  if (!escolhidos.length) return baseMontagem();
  return Math.max(...escolhidos.map((s) => (s ? precoSabor(s.id, estado.tamanhoId) || 0 : 0)));
};

const preco = () => {
  const adicionais = estado.secoes.reduce(
    (soma, secao, indice) => {
      if (estado.saboresSecao?.[indice]) return soma;
      return soma + secao.reduce((s, item) => { const e = extra(item.id); return s + (e ? precoDe(e) : 0) * item.porcoes; }, 0);
    },
    0
  );
  return precoBase() + borda(estado.bordaId).preco + adicionais;
};

const nomesDaSecao = (secao: any) => secao.map((item: any) => extra(item.id)?.nome.toLowerCase()).filter(Boolean);

const nomesDaParte = (indice: any) => {
  const id = estado.saboresSecao?.[indice];
  if (id) return saborDe(id)?.nome || 'sabor';
  return nomesDaSecao(estado.secoes[indice] || []).join(', ') || 'mussarela';
};

const resumoTexto = () => {
  const nomes = estado.secoes.map((_, indice) => nomesDaParte(indice));
  if (estado.partes === 1) return `${tamanho(estado.tamanhoId).nome.toLowerCase()} · ${nomes[0]}`;
  return nomes.join(' | ');
};

const nomePizza = () => {
  if (estado.partes === 1) {
    const nomes = nomesDaSecao(estado.secoes[0]);
    return nomes.length ? `Pizza de ${nomes[0]}` : 'Minha pizza';
  }
  return `Pizza ${estado.partes} sabores`;
};

const secoesParaCena = () =>
  estado.secoes.map((secao) =>
    secao.map((item) => ({ nome: item.id, qtd: Math.max(1, Math.round(pecasDe(item.id) * fatorParte())) * item.porcoes }))
  );

const ajustarSecoes = (partes: any) => {
  estado.secoes = Array.from({ length: partes }, () => []);
  estado.saboresSecao = Array.from({ length: partes }, () => null);
  estado.ativa = 0;
};

const reiniciarPizza = () => {
  const tinhaAlgo = estado.secoes.some((secao) => secao.length);
  if (!tinhaAlgo) return false;
  estado.secoes = Array.from({ length: estado.partes }, () => []);
  estado.ativa = 0;
  return true;
};

const diagrama = (partes: any) => {
  if (partes === 1) return '<circle cx="16" cy="16" r="13" fill="currentColor" opacity=".22"/>';
  const passo = (Math.PI * 2) / partes;
  let d = '';
  for (let i = 0; i < partes; i++) {
    const a0 = -Math.PI / 2 + i * passo;
    const a1 = a0 + passo;
    d += `M16 16 L${(16 + Math.cos(a0) * 13).toFixed(1)} ${(16 + Math.sin(a0) * 13).toFixed(1)} A13 13 0 ${passo > Math.PI ? 1 : 0} 1 ${(16 + Math.cos(a1) * 13).toFixed(1)} ${(16 + Math.sin(a1) * 13).toFixed(1)} Z`;
  }
  return `<path d="${d}" fill="currentColor" opacity=".22" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>`;
};

export const renderEstudio = (alvo: any, aoVoltar: any) => {
  const palco = el('canvas', { class: 'estudio__canvas' });
  const painel = el('div', { class: 'estudio__painel' });
  const trilha = el('ol', { class: 'trilha' });
  const total = el('strong', { class: 'estudio__total' });
  const acao = el('button', { type: 'button', class: 'botao botao--primario botao--grande' });
  const fallback = el('div', { class: 'estudio__fallback', html: pizzaArt(['mussarela'], 9) });

  const sincronizar = () => {
    forja?.atualizar({
      partes: estado.partes,
      fatias: tamanho(estado.tamanhoId).fatias,
      bordaId: estado.bordaId,
      secoes: secoesParaCena(),
      destaque: estado.passo === 2 && estado.partes > 1 ? estado.ativa : -1,
      girar: false,
    });
    forja?.definirTamanho(estado.tamanhoId);
  };

  const desenharTrilha = () => {
    limpar(trilha);
    trilha.append(
      ...PASSOS.map((p) =>
        el('li', {
          class: `trilha__item ${p.id === estado.passo ? 'trilha__item--ativo' : ''} ${p.id < estado.passo ? 'trilha__item--feito' : ''}`,
          onclick: () => {
            if (p.id <= estado.passo) {
              estado.passo = p.id;
              desenhar();
            }
          },
        }, [
          el('span', { class: 'trilha__numero' }, String(p.id)),
          el('span', { class: 'trilha__nome' }, p.nome),
        ])
      )
    );
  };

  const blocoTamanho = () =>
    el('section', { class: 'estudio__bloco' }, [
      el('h2', {}, 'Quantas pessoas?'),
      el('p', { class: 'estudio__dica' }, 'O tamanho muda a massa. Os sabores você escolhe no próximo passo.'),
      el('div', { class: 'tamanhos' }, TAMANHOS.map((t) =>
        el('button', {
          type: 'button',
          class: `tamanho-card ${estado.tamanhoId === t.id ? 'tamanho-card--ativo' : ''}`,
          onclick: () => {
            estado.tamanhoId = t.id;
            forja?.definirTamanho(t.id);
            desenhar();
          },
        }, [
          el('span', { class: 'tamanho-card__medida' }, t.medida),
          el('strong', {}, t.nome),
          el('span', { class: 'tamanho-card__fatias' }, `${t.fatias} fatias`),
          el('span', { class: 'tamanho-card__preco' }, brl(Math.round(MONTAGEM.preco * t.fator))),
        ])
      )),
      el('h2', { class: 'estudio__subtitulo' }, 'Dividir em quantos sabores?'),
      el('p', { class: 'estudio__dica' }, 'Cada parte recebe os seus próprios ingredientes.'),
      el('div', { class: 'partes' }, [1, 2, 3, 4].map((n) =>
        el('button', {
          type: 'button',
          class: `parte-card ${estado.partes === n ? 'parte-card--ativo' : ''}`,
          onclick: () => {
            if (n === estado.partes) return;
            const tinhaAlgo = estado.secoes.some((secao) => secao.length);
            estado.partes = n;
            ajustarSecoes(n);
            sincronizar();
            desenhar();
            if (tinhaAlgo) toast(`Pizza reiniciada para ${n === 1 ? '1 sabor' : `${n} sabores`}`);
          },
        }, [
          el('span', { class: 'parte-card__diagrama', html: `<svg viewBox="0 0 32 32">${diagrama(n)}</svg>` }),
          el('strong', {}, n === 1 ? '1 sabor' : `${n} sabores`),
          el('span', { class: 'parte-card__corte' }, n === 1 ? 'inteira' : n === 2 ? 'meio a meio' : n === 3 ? 'três partes' : 'quatro partes'),
        ])
      )),
    ]);

  const abasSecoes = () =>
    el('div', { class: 'secoes-abas' }, estado.secoes.map((secao, i) =>
      el('button', {
        type: 'button',
        class: `secao-aba ${i === estado.ativa ? 'secao-aba--ativa' : ''}`,
        onclick: () => {
          estado.ativa = i;
          sincronizar();
          desenhar();
        },
      }, [
        el('span', { class: 'secao-aba__cor', style: { '--cor': i % 2 ? '#1c8a4e' : '#d33a2c' } }),
        el('span', {}, `Parte ${i + 1}`),
        el('span', { class: 'secao-aba__contagem' }, secao.length ? `${secao.length}` : '0'),
      ])
    ));

  const escolherSabor = (id: any) => {
    const indice = estado.ativa;
    if (!id) {
      estado.saboresSecao[indice] = null;
      estado.secoes[indice] = [];
    } else {
      const s = saborDe(id);
      if (!s) return;
      estado.saboresSecao[indice] = id;
      estado.secoes[indice] = s.itens.map((item) => ({ id: item, porcoes: 1 }));
    }
    sincronizar();
    desenhar();
  };

  const seletorSabor = () =>
    el('div', { class: 'seletor-sabor' }, [
      el('span', { class: 'campo-rotulo' }, 'Sabor do cardápio'),
      el('div', { class: 'seletor-sabor__lista' }, [
        el('button', {
          type: 'button',
          class: `sabor-chip ${!estado.saboresSecao[estado.ativa] ? 'sabor-chip--ativo' : ''}`,
          onclick: () => escolherSabor(null),
        }, 'Montar do zero'),
        ...saboresAtivos().map((s) =>
          el('button', {
            type: 'button',
            class: `sabor-chip ${estado.saboresSecao[estado.ativa] === s.id ? 'sabor-chip--ativo' : ''}`,
            title: (s.itens || []).join(' · '),
            onclick: () => escolherSabor(s.id),
          }, `${s.nome} · ${brl(precoSabor(s.id, estado.tamanhoId) || 0)}`)
        ),
      ]),
    ]);

  const blocoIngredientes = () => {
    const secao = estado.secoes[estado.ativa] || [];
    // atualiza contador, resumo e total sem reconstruir o painel: trocar o DOM inteiro
    // a cada porcao jogava a rolagem da pagina para outro lugar
    const atualizarContadores = () => {
      for (const item of estado.secoes[estado.ativa] || []) {
        const linha = painel.querySelector(`.ingrediente-linha[data-id="${item.id}"]`);
        const valor = linha?.querySelector('.contador-porcoes__valor');
        if (!valor) continue;
        const complemento = extra(item.id);
        valor.textContent = `${item.porcoes}×`;
        valor.append(el('span', { class: 'contador-porcoes__gramas' }, ` · ${complemento ? gramasDe(complemento) * item.porcoes : 0} g`));
      }
      const resumo = painel.querySelector('.resumo-secao');
      if (resumo) {
        const secao = estado.secoes[estado.ativa] || [];
        const gramas = secao.reduce((soma, item) => {
          const complemento = extra(item.id);
          return soma + (complemento ? gramasDe(complemento) : 0) * item.porcoes;
        }, 0);
        const valor = secao.reduce((soma, item) => {
          const complemento = extra(item.id);
          return soma + (complemento ? precoDe(complemento) : 0) * item.porcoes;
        }, 0);
        limpar(resumo);
        resumo.append(el('span', { class: 'nota' }, `${gramas} g nesta parte`), el('strong', {}, brl(valor)));
      }
      total.textContent = brl(preco());
    };

    const alterar = (id: any, delta: any) => {
      const atual = estado.secoes[estado.ativa] || [];
      const existente = atual.find((item) => item.id === id);
      const tinhaLinha = Boolean(existente);
      if (!existente && delta > 0) {
        estado.secoes[estado.ativa] = [...atual, { id, porcoes: 1 }];
      } else if (existente) {
        const porcoes = existente.porcoes + delta;
        estado.secoes[estado.ativa] = porcoes <= 0
          ? atual.filter((item) => item.id !== id)
          : atual.map((item) => (item.id === id ? { ...item, porcoes } : item));
      }
      sincronizar();
      const agora = (estado.secoes[estado.ativa] || []).some((item) => item.id === id);
      if (tinhaLinha && agora) atualizarContadores();
      else desenhar();
    };

    return el('section', { class: 'estudio__bloco' }, [
      el('h2', {}, estado.partes === 1 ? 'Os ingredientes' : `Ingredientes da parte ${estado.ativa + 1}`),
      el('p', { class: 'estudio__dica' }, 'Mussarela de búfala já vai. Cada porção é a quantidade que cai na pizza — some quantas quiser.'),
      estado.partes > 1 ? abasSecoes() : null,
      seletorSabor(),
      el('div', { class: 'ingredientes-lista' }, [...EXTRAS, ...extrasDoCatalogo()].map((x) => {
        const item = secao.find((i) => i.id === x.id);
        return el('div', { class: `ingrediente-linha ${item ? 'ingrediente-linha--ativo' : ''}`, 'data-id': x.id }, [
          el('button', {
            type: 'button', class: 'ingrediente-linha__corpo',
            onclick: () => alterar(x.id, 1),
          }, [
            el('img', { class: 'ingrediente-linha__thumb', src: miniatura(x.id), alt: '', loading: 'lazy', width: '30', height: '30' }),
            el('span', { class: 'ingrediente-linha__texto' }, [
              el('span', { class: 'ingrediente-linha__nome' }, x.nome),
              el('span', { class: 'ingrediente-linha__unidade' }, [
                `${gramasDe(x)} g por porção`,
                el('span', { class: 'ingrediente-linha__preco' }, ` · ${brl(precoDe(x))}`),
              ]),
            ]),
            el('span', { class: 'ingrediente-linha__marca' }, item ? '✓' : '+'),
          ]),
          item
            ? el('div', { class: 'contador-porcoes' }, [
                el('button', { type: 'button', class: 'contador-porcoes__botao', 'aria-label': 'Menos', onclick: () => alterar(x.id, -1) }, '−'),
                el('span', { class: 'contador-porcoes__valor' }, [
                  `${item.porcoes}×`,
                  el('span', { class: 'contador-porcoes__gramas' }, ` · ${gramasDe(x) * item.porcoes} g`),
                ]),
                el('button', { type: 'button', class: 'contador-porcoes__botao', 'aria-label': 'Mais', onclick: () => alterar(x.id, 1) }, '+'),
              ])
            : null,
        ]);
      })),
      el('div', { class: 'resumo-secao' }, [
        el('span', { class: 'nota' }, `${secao.reduce((s, item) => { const e = extra(item.id); return s + (e ? gramasDe(e) : 0) * item.porcoes; }, 0)} g nesta parte`),
        el('strong', {}, brl(secao.reduce((s, item) => { const e = extra(item.id); return s + (e ? precoDe(e) : 0) * item.porcoes; }, 0))),
      ]),
    ]);
  };

  const blocoBorda = () =>
    el('section', { class: 'estudio__bloco' }, [
      el('h2', {}, 'E a borda?'),
      el('p', { class: 'estudio__dica' }, 'A massa é a mesma; o recheio da beirada muda a experiência.'),
      el('div', { class: 'bordas' }, BORDAS.map((b) =>
        el('button', {
          type: 'button',
          class: `borda-card ${estado.bordaId === b.id ? 'borda-card--ativo' : ''}`,
          onclick: () => {
            estado.bordaId = b.id;
            sincronizar();
            desenhar();
          },
        }, [
          el('strong', {}, b.nome),
          el('span', { class: 'borda-card__preco' }, b.preco ? `+ ${brl(b.preco)}` : 'inclusa'),
          el('span', { class: 'borda-card__recheio' }, b.recheio ? 'recheio dentro da borda' : 'borda simples'),
        ])
      )),
    ]);

  const blocoRevisao = () =>
    el('section', { class: 'estudio__bloco' }, [
      el('h2', {}, 'Sua pizza'),
      el('p', { class: 'estudio__dica' }, 'Se estiver certo, é só fechar o pedido.'),
      el('ul', { class: 'revisao' }, [
        el('li', {}, [el('span', {}, 'Tamanho'), el('strong', {}, `${tamanho(estado.tamanhoId).nome} · ${tamanho(estado.tamanhoId).medida}`)]),
        el('li', {}, [el('span', {}, 'Divisão'), el('strong', {}, estado.partes === 1 ? 'inteira' : `${estado.partes} partes`)]),
        ...estado.secoes.map((secao, i) =>
          el('li', {}, [
            el('span', {}, estado.partes === 1 ? 'Ingredientes' : `Parte ${i + 1}`),
            el('strong', {}, secao.map((item) => `${extra(item.id)?.nome}${item.porcoes > 1 ? ` (${item.porcoes}×)` : ''}`).join(', ') || 'só mussarela'),
          ])
        ),
        el('li', {}, [el('span', {}, 'Borda'), el('strong', {}, borda(estado.bordaId).nome)]),
        el('li', { class: 'revisao__total' }, [el('span', {}, 'Total'), el('strong', {}, brl(preco()))]),
      ]),
      el('button', {
        type: 'button', class: 'botao botao--primario botao--grande botao--largo',
        onclick: () => {
          rascunho.adicionar({
            nome: nomePizza(),
            detalhe: resumoTexto(),
            preco: preco(),
            qtd: 1,
            tipo: 'pizza',
            toppings: estado.secoes.flatMap((secao) => secao.map((item) => item.id)),
            partes: estado.partes,
            cena: {
              partes: estado.partes,
              bordaId: estado.bordaId,
              tamanhoId: estado.tamanhoId,
              secoes: secoesParaCena(),
            },
            arte: pizzaArt(['mussarela', ...estado.secoes.flatMap((secao) => secao.map((item) => item.id))], 9),
          });
          toast('Pizza na sacola.');
          iniciarEtapas();
          estado.passo = 5;
          desenhar();
        },
      }, 'Adicionar ao pedido'),
    ]);

  const desenhar = () => {
    desenharTrilha();
    // o painel e reconstruido inteiro: sem guardar a rolagem, esvaziar o painel encolhe
    // a pagina e o navegador joga o scroll para o topo a cada porcao adicionada
    const rolagemPagina = window.scrollY;
    const rolagemPainel = painel.scrollTop;
    const montado = el('div', { class: 'estudio__conteudo' });
    const semPalco = estado.passo >= 5 || Boolean(pedidoConcluido);
    dica.textContent = PASSOS[Math.min(estado.passo, PASSOS.length) - 1].dica;
    const ativo = trilha.querySelector('.trilha__item--ativo') as HTMLElement | null;
    if (ativo && trilha.scrollWidth > trilha.clientWidth) {
      const alvo = ativo.offsetLeft - (trilha.clientWidth - ativo.clientWidth) / 2;
      trilha.scrollTo({ left: Math.max(0, alvo), behavior: 'smooth' });
    }
    raiz.classList.toggle('estudio--checkout', semPalco);
    if (semPalco && forja) {
      forja.destruir();
      forja = null;
    } else if (!semPalco && !forja && recarregarPalco) {
      recarregarPalco();
    }
    if (pedidoConcluido) {
      renderConcluido(montado, pedidoConcluido, {
        aoNova: () => { reiniciarEtapas(); pedidoConcluido = null; estado.passo = 1; desenhar(); },
        aoLoja: () => aoVoltar(),
      });
      const pedido: any = porNumero(pedidoConcluido.numero);
      total.textContent = brl(pedido?.total || 0);
      acao.textContent = 'Voltar à loja';
      acao.onclick = () => aoVoltar();
      painel.replaceChildren(...montado.childNodes);
      return;
    }
    if (estado.passo >= 5) {
      pararRastreio();
      renderEtapa(estado.passo - 4, montado, {
        aoRedesenhar: desenhar,
        aoConcluir: (id: any) => {
          const numero = Number(String(id).replace(/\D+/g, ''));
          const pedido: any = porNumero(numero);
          void guardarPedido({ numero, id: String(id), total: pedido?.total || 0, tipo: pedidoConcluido?.tipo || 'entrega', status: pedido?.status || 'preparo' });
          pedidoConcluido = {
            id,
            numero,
            tipo: pedido?.tipo === 'retirada' ? 'retirada' : 'entrega',
            pedido,
          };
          estado.passo = 8;
          rascunho.limpar();
          desenhar();
        },
      });
      total.textContent = brl(rascunho.total());
    } else {
      montado.append(
        estado.passo === 1 ? blocoTamanho()
        : estado.passo === 2 ? blocoIngredientes()
        : estado.passo === 3 ? blocoBorda()
        : blocoRevisao()
      );
      total.textContent = brl(preco());
    }
    painel.replaceChildren(...montado.childNodes);
    const restaurarRolagem = () => {
      painel.scrollTop = rolagemPainel;
      if (Math.abs(window.scrollY - rolagemPagina) > 1) window.scrollTo({ top: rolagemPagina });
    };
    restaurarRolagem();
    requestAnimationFrame(restaurarRolagem);

    if (estado.passo < 4) {
      acao.textContent = 'Continuar';
      acao.onclick = () => { estado.passo += 1; desenhar(); };
      return;
    }
    if (estado.passo === 4) {
      acao.textContent = 'Adicionar ao pedido';
      acao.onclick = () => {
        (painel.querySelector('.estudio__bloco .botao--primario') as HTMLElement | null)?.click();
      };
      return;
    }
    if (estado.passo === 5) {
      acao.textContent = 'Continuar';
      acao.onclick = () => { estado.passo = 6; desenhar(); };
      return;
    }
    if (estado.passo === 6) {
      acao.textContent = 'Ir para o pagamento';
      acao.onclick = async () => {
        const erro = validarDados();
        if (erro) { toast(erro, 'erro'); return; }
        const foraDoRaio = await validarEntrega();
        if (foraDoRaio) { desenhar(); toast(foraDoRaio, 'erro'); return; }
        const falha = await criarContaSeQuiser();
        if (falha) { toast(falha, 'erro'); return; }
        estado.passo = 7;
        desenhar();
      };
      return;
    }
    acao.textContent = 'Confirmar pagamento';
    acao.onclick = () => {
      const botao = painel.querySelector('.passo__bloco .botao--primario') as HTMLElement | null;
      if (botao && !(botao as any).disabled) botao.click();
    };
  };

  const dica = el('span', { class: 'nota' }, PASSOS[0].dica);

  const navegacao = el('div', { class: 'estudio__nav' }, [
    el('button', {
      type: 'button', class: 'botao botao--vidro',
      onclick: () => {
        if (pedidoConcluido) { aoVoltar(); return; }
        if (estado.passo === 1) aoVoltar();
        else {
          estado.passo -= 1;
          desenhar();
        }
      },
    }, '← Voltar'),
    el('div', { class: 'estudio__totais' }, [el('span', { class: 'nota' }, 'Total'), total]),
    acao,
  ]);

  raiz = el('div', { class: 'estudio' });
  raiz.append(
      el('header', { class: 'estudio__topo' }, [
        el('button', { type: 'button', class: 'botao botao--vidro botao--mini', onclick: aoVoltar }, '← Loja'),
        el('div', { class: 'estudio__titulo' }, [el('strong', {}, 'Monte a sua pizza'), dica]),
        el('span', { class: 'estudio__selo' }, '3D ao vivo'),
      ]),
      trilha,
      el('div', { class: 'estudio__corpo' }, [
        el('div', { class: 'estudio__palco' }, [fallback, palco, el('span', { class: 'estudio__dica-giro' }, 'arraste para girar')]),
        painel,
      ]),
    navegacao,
  );
  alvo.append(raiz);

  desenhar();

  const carregar = async () => {
    if (!carregando) carregando = import('../../shared/lib/pizza3d.js');
    const { criarForja } = await carregando;
    const instancia = await criarForja(palco, {
      partes: estado.partes,
      bordaId: estado.bordaId,
      secoes: secoesParaCena(),
    });
    if (!instancia) return;
    if (!document.body.contains(palco)) {
      instancia.destruir();
      return;
    }
    forja = instancia;
    forja.definirTamanho(estado.tamanhoId);
    alvo.querySelector('.estudio__palco').classList.add('tem-3d');
  };
  recarregarPalco = () => { carregar().catch(() => void 0); };
  carregar().catch(() => void 0);

  return {
    destruir: () => {
      pararRastreio();
      forja?.destruir();
      forja = null;
      despachar = null;
    },
  };
};
