import { SITE } from '../../shared/config/site.js';
import { brl, telefone, cep, cartao } from '../../shared/format/format.js';
import { el, toast } from '../../shared/ui/dom.js';
import { bebidaArt } from '../../shared/ui/art.js';
import QR from '../../shared/lib/qr.js';
import { BEBIDAS } from '../../api/services/menu.service.js';
import { rascunho } from '../pedido/rascunho.js';
import { contaAtual, cadastrar, identificadorValido } from '../../api/services/account.service.js';
import { abrirPedidosDoDispositivo } from '../conta/conta.js';
import {
  criarCobranca,
  pixCopiaECola,
  cobranca,
  baixarCobranca,
  cobrarCartao,
  CARTAO_TESTE,
  urlDoDemo,
} from '../../api/services/payment.service.js';
import { criar as criarPedido } from '../../api/services/orders.service.js';
import { taxaPara } from '../../api/services/config.service.js';
import { verificarRaio, sugerir, buscarCep, sugerirCep, localizar, distanciaKm, CENTRO, RAIO_ENTREGA_KM } from '../../api/services/geo.service.js';
import type { Sugestao, AchadoCep } from '../../api/services/geo.service.js';
import { porNumero } from '../../api/services/orders.service.js';
import { pedidosDaSessao } from '../../api/services/rastreio.service.js';
import { STATUS_PEDIDO } from '../../shared/config/site.js';
import { limpar } from '../../shared/ui/dom.js';
import { criarDoCheckout } from '../../api/services/clientes.service.js';

export interface ContextoEtapa {
  aoRedesenhar: () => void;
  aoConcluir: (pedidoId: any, autorizacao?: any) => void;
}

interface EstadoEtapa {
  modo: string;
  nome: string;
  fone: string;
  cep: string;
  cidade: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  querConta: boolean;
  identificador: string;
  senha: string;
  pagamento: string;
  cobrancaId: string | null;
  clienteId: string | null;
  distanciaKm: number | null;
  erroEntrega: string;
  ponto: { lat: number; lng: number } | null;
}

const estado: EstadoEtapa = {
  modo: 'entrega',
  nome: '',
  fone: '',
  cep: '',
  cidade: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  querConta: false,
  identificador: '',
  senha: '',
  pagamento: 'pix',
  cobrancaId: null,
  clienteId: null,
  distanciaKm: null,
  erroEntrega: '',
  ponto: null,
};

export const iniciarEtapas = () => {
  estado.modo = rascunho.modo();
  estado.distanciaKm = null;
  estado.erroEntrega = '';
  estado.ponto = null;
  estado.querConta = false;
  estado.pagamento = 'pix';
  estado.cobrancaId = null;
  estado.clienteId = null;
  const conta = contaAtual();
  if (conta && !estado.nome) estado.nome = conta.nome;
};

export const modoEtapa = () => estado.modo;

const enderecoTexto = () => {
  if (estado.modo === 'retirada') return `Retirada no balcão — ${SITE.endereco}`;
  const linha = `${estado.rua}, ${estado.numero}${estado.complemento ? ` — ${estado.complemento}` : ''}`;
  return `${linha} — ${estado.bairro}, ${SITE.cidade.split(',')[0]}`;
};

const garantirCliente = async () => {
  if (estado.clienteId) return estado.clienteId;
  const nome = estado.nome.trim();
  if (!nome) return null;
  try {
    const cliente = await criarDoCheckout({ nome, telefone: estado.fone, endereco: enderecoTexto() });
    estado.clienteId = cliente?.id || null;
  } catch {
    estado.clienteId = null;
  }
  return estado.clienteId;
};

export const validarDados = (): string | null => {
  if (estado.nome.trim().length < 3) return 'Informe o nome de quem recebe.';
  if (estado.fone.replace(/\D/g, '').length < 10) return 'Telefone com DDD.';
  if (estado.modo === 'entrega') {
    if (estado.cep.replace(/\D/g, '').length !== 8) return 'CEP incompleto.';
    if (estado.rua.trim().length < 3) return 'Informe a rua.';
    if (!estado.numero.trim()) return 'Informe o número.';
    if (estado.bairro.trim().length < 2) return 'Informe o bairro.';
  }
  if (estado.querConta && !contaAtual()) {
    if (estado.nome.trim().split(/\s+/).length < 2) return 'Na conta, use nome e sobrenome.';
    if (!identificadorValido(estado.identificador)) return 'Use um e-mail ou um celular com DDD.';
    if (estado.senha.length < 6) return 'Senha de pelo menos 6 caracteres.';
  }
  return null;
};

export const validarEntrega = async (): Promise<string | null> => {
  if (estado.modo === 'retirada') {
    estado.distanciaKm = null;
    estado.erroEntrega = '';
    return null;
  }
  if (estado.ponto) {
    const km = distanciaKm(CENTRO, estado.ponto);
    estado.distanciaKm = km;
    if (km > RAIO_ENTREGA_KM) {
      estado.erroEntrega = `Entregamos até ${RAIO_ENTREGA_KM} km da pizzaria. Este endereço está a ${km.toFixed(1).replace('.', ',')} km — escolha retirar no balcão.`;
      return estado.erroEntrega;
    }
    estado.erroEntrega = '';
    return null;
  }
  const resultado = await verificarRaio({
    rua: estado.rua,
    numero: estado.numero,
    bairro: estado.bairro,
    cep: estado.cep,
    cidade: estado.cidade || SITE.cidade,
  });
  estado.distanciaKm = resultado.km;
  estado.erroEntrega = resultado.erro || '';
  return resultado.erro;
};

export const criarContaSeQuiser = async (): Promise<string | null> => {
  if (!estado.querConta || contaAtual()) return null;
  const resposta = await cadastrar({ nome: estado.nome, identificador: estado.identificador, senha: estado.senha });
  if (!resposta.ok) return resposta.erro || 'Não foi possível criar a conta';
  return null;
};

const criarCobrancaUnica = (metodo: string) => {
  if (estado.cobrancaId) return estado.cobrancaId;
  // o cadastro do cliente vai para o banco em paralelo; a cobrança usa o id quando já existe
  void garantirCliente();
  estado.cobrancaId = criarCobranca({
    total: rascunho.total(),
    subtotal: rascunho.subtotal(),
    taxa: rascunho.taxa(),
    itens: rascunho.itens(),
    cliente: { nome: estado.nome.trim(), telefone: estado.fone },
    endereco: enderecoTexto(),
    modo: estado.modo,
    contaId: contaAtual()?.id || null,
    clienteId: estado.clienteId || null,
    desconto: rascunho.desconto(),
    metodo,
  });
  return estado.cobrancaId;
};

const campo = (rotulo: any, entrada: any) =>
  el('label', { class: 'entrada' }, [el('span', { class: 'entrada__rotulo' }, rotulo), entrada]);

const texto = (atributos: any) => el('input', { class: 'entrada__campo', ...atributos });

const resumoDoPedido = () =>
  el('aside', { class: 'pedido' }, [
    el('h3', { class: 'pedido__titulo' }, 'Seu pedido'),
    el('ul', { class: 'pedido__itens' },
      rascunho.itens().map((item) =>
        el('li', { class: 'pedido__item' }, [
          el('span', { class: 'pedido__qtd' }, `${item.qtd}×`),
          el('span', { class: 'pedido__nome' }, item.nome),
          el('span', { class: 'pedido__valor' }, brl(item.preco * item.qtd)),
        ])
      )
    ),
    el('div', { class: 'pedido__contas' }, [
      el('div', { class: 'pedido__linha' }, [el('span', {}, 'Subtotal'), el('span', {}, brl(rascunho.subtotal()))]),
      el('div', { class: 'pedido__linha' }, [
        el('span', {}, estado.modo === 'retirada' ? 'Retirada no balcão' : 'Entrega'),
        el('span', {}, rascunho.taxa() ? brl(rascunho.taxa()) : 'grátis'),
      ]),
      rascunho.desconto()
        ? el('div', { class: 'pedido__linha pedido__linha--desconto' }, [el('span', {}, 'Desconto'), el('span', {}, `− ${brl(rascunho.desconto())}`)])
        : null,
      el('div', { class: 'pedido__linha pedido__linha--total' }, [el('span', {}, 'Total'), el('span', {}, brl(rascunho.total()))]),
    ]),
    el('p', { class: 'pedido__prazo' }, estado.modo === 'retirada' ? SITE.tempoRetirada + ' para retirar' : SITE.tempoEntrega + ' de entrega'),
  ]);

const cabecalho = (indice: number, titulo: string, apoio: string) =>
  el('header', { class: 'etapa__cabecalho' }, [
    el('span', { class: 'etapa__indice' }, `Passo ${indice} de 3`),
    el('h2', { class: 'etapa__titulo' }, titulo),
    el('p', { class: 'etapa__apoio' }, apoio),
  ]);

const escolhidas = () => rascunho.itens().filter((item) => item.tipo === 'bebida');

const etapaBebidas = (ctx: ContextoEtapa) => {
  const noPedido = new Set(escolhidas().map((item) => `${item.nome}|${item.detalhe}`));
  const grade = el('div', { class: 'bebidas' },
    BEBIDAS.map((bebida) =>
      el('button', {
        type: 'button',
        class: `bebida${noPedido.has(`${bebida.nome}|${bebida.detalhe}`) ? ' bebida--dentro' : ''}`,
        onclick: () => {
          rascunho.adicionar({
            nome: bebida.nome,
            detalhe: bebida.detalhe,
            preco: bebida.preco,
            qtd: 1,
            tipo: 'bebida',
            arte: bebidaArt(bebida.arte),
          });
          toast(`${bebida.nome} no pedido.`);
          ctx.aoRedesenhar();
        },
      }, [
        el('span', { class: 'bebida__arte', html: bebidaArt(bebida.arte) }),
        el('span', { class: 'bebida__texto' }, [
          el('strong', { class: 'bebida__nome' }, bebida.nome),
          el('span', { class: 'bebida__detalhe' }, bebida.detalhe),
        ]),
        el('span', { class: 'bebida__preco' }, brl(bebida.preco)),
      ])
    )
  );

  const principal = el('div', { class: 'etapa__principal' }, [grade]);

  const escolhidasAgora = escolhidas();
  if (escolhidasAgora.length) {
    principal.append(
      el('section', { class: 'escolhidos' }, [
        el('h3', { class: 'escolhidos__titulo' }, 'Já no pedido'),
        el('ul', { class: 'escolhidos__lista' },
          escolhidasAgora.map((item) => {
            const indice = rascunho.itens().indexOf(item);
            return el('li', { class: 'escolhidos__item' }, [
              el('span', { class: 'escolhidos__nome' }, [el('strong', {}, item.nome), el('span', { class: 'escolhidos__detalhe' }, item.detalhe)]),
              el('span', { class: 'escolhidos__contador' }, [
                el('button', { type: 'button', class: 'escolhidos__botao', 'aria-label': 'Remover um', onclick: () => { rascunho.mudarQtd(indice, -1); ctx.aoRedesenhar(); } }, '−'),
                el('span', { class: 'escolhidos__qtd' }, String(item.qtd)),
                el('button', { type: 'button', class: 'escolhidos__botao', 'aria-label': 'Adicionar um', onclick: () => { rascunho.mudarQtd(indice, 1); ctx.aoRedesenhar(); } }, '+'),
              ]),
              el('span', { class: 'escolhidos__valor' }, brl(item.preco * item.qtd)),
            ]);
          })
        ),
      ])
    );
  }

  return el('section', { class: 'etapa' }, [
    cabecalho(1, 'Quer algo para acompanhar?', 'Refrigerante, suco, cerveja ou água — entra no mesmo pedido.'),
    el('div', { class: 'etapa__grade' }, [principal, resumoDoPedido()]),
  ]);
};

const campoCep = (ctx: ContextoEtapa) => {
  const lista = el('div', { class: 'sugestoes', hidden: true });
  let relogio: any = null;

  const localizarEAplicar = async (achado: AchadoCep) => {
    estado.cep = achado.cep;
    estado.rua = achado.rua || estado.rua;
    estado.bairro = achado.bairro || estado.bairro;
    estado.cidade = achado.cidade || estado.cidade;
    estado.ponto = null;
    estado.distanciaKm = null;
    estado.erroEntrega = '';
    ctx.aoRedesenhar();
    const ponto = await localizar({
      rua: estado.rua,
      numero: estado.numero,
      bairro: estado.bairro,
      cep: estado.cep,
      cidade: estado.cidade || SITE.cidade,
    });
    if (!ponto) return;
    estado.ponto = ponto;
    estado.distanciaKm = distanciaKm(CENTRO, ponto);
    estado.erroEntrega = estado.distanciaKm > RAIO_ENTREGA_KM
      ? `Entregamos até ${RAIO_ENTREGA_KM} km da pizzaria. Este endereço está a ${estado.distanciaKm.toFixed(1).replace('.', ',')} km — escolha retirar no balcão.`
      : '';
    ctx.aoRedesenhar();
  };

  const entrada = el('input', {
    class: 'entrada__campo',
    value: estado.cep,
    placeholder: '05000-000',
    inputmode: 'numeric',
    autocomplete: 'postal-code',
    oninput: (e: any) => {
      estado.cep = cep(e.target.value);
      e.target.value = estado.cep;
      estado.ponto = null;
      const digitos = estado.cep.replace(/\D/g, '');
      if (relogio) clearTimeout(relogio);
      if (digitos.length < 5) {
        limpar(lista);
        lista.hidden = true;
        return;
      }
      relogio = setTimeout(async () => {
        if (digitos.length === 8) {
          const achado = await buscarCep(digitos);
          limpar(lista);
          if (!achado) {
            lista.hidden = true;
            return;
          }
          if (estado.rua.trim().length < 3) {
            lista.hidden = true;
            await localizarEAplicar(achado);
            return;
          }
          lista.hidden = false;
          lista.append(
            el('button', {
              type: 'button', class: 'sugestao',
              onclick: () => { lista.hidden = true; void localizarEAplicar(achado); },
            }, [
              el('strong', { class: 'sugestao__rua' }, [achado.rua, achado.bairro, achado.cidade].filter(Boolean).join(' · ') || `CEP ${achado.cep}`),
              el('span', { class: 'sugestao__extra' }, 'usar este endereço'),
            ])
          );
          return;
        }
        const faixas = await sugerirCep(digitos);
        limpar(lista);
        if (!faixas.length) {
          lista.hidden = true;
          return;
        }
        lista.hidden = false;
        for (const faixa of faixas) {
          lista.append(
            el('button', {
              type: 'button', class: 'sugestao',
              onclick: () => {
                if (faixa.bairro) estado.bairro = faixa.bairro;
                if (faixa.cidade) estado.cidade = faixa.cidade;
                estado.ponto = null;
                ctx.aoRedesenhar();
              },
            }, [
              el('strong', { class: 'sugestao__rua' }, faixa.rotulo),
              el('span', { class: 'sugestao__extra' }, `faixa ${faixa.faixa}`),
            ])
          );
        }
      }, 320);
    },
    onblur: () => setTimeout(() => { lista.hidden = true; }, 180),
  });

  return el('label', { class: 'entrada entrada--sugestao' }, [
    el('span', { class: 'entrada__rotulo' }, 'CEP'),
    entrada,
    lista,
  ]);
};

const campoRua = (ctx: ContextoEtapa) => {
  const lista = el('div', { class: 'sugestoes', hidden: true });
  let relogio: any = null;
  const entrada = el('input', {
    class: 'entrada__campo',
    value: estado.rua,
    placeholder: 'Comece a digitar a rua',
    autocomplete: 'off',
    oninput: (e: any) => {
      estado.rua = e.target.value;
      estado.ponto = null;
      const consulta = e.target.value;
      if (relogio) clearTimeout(relogio);
      if (consulta.trim().length < 4) {
        limpar(lista);
        lista.hidden = true;
        return;
      }
      relogio = setTimeout(async () => {
        const achados = await sugerir(consulta);
        limpar(lista);
        if (!achados.length) {
          lista.hidden = true;
          return;
        }
        lista.hidden = false;
        for (const sugestao of achados) {
          lista.append(
            el('button', {
              type: 'button', class: 'sugestao',
              onclick: () => {
                estado.rua = sugestao.rua;
                if (sugestao.numero) estado.numero = sugestao.numero;
                if (sugestao.bairro) estado.bairro = sugestao.bairro;
                if (sugestao.cep) estado.cep = sugestao.cep;
                if (sugestao.cidade) estado.cidade = sugestao.cidade;
                estado.ponto = { lat: sugestao.lat, lng: sugestao.lng };
                estado.distanciaKm = distanciaKm(CENTRO, estado.ponto);
                estado.erroEntrega = estado.distanciaKm > RAIO_ENTREGA_KM
                  ? `Entregamos até ${RAIO_ENTREGA_KM} km da pizzaria. Este endereço está a ${estado.distanciaKm.toFixed(1).replace('.', ',')} km — escolha retirar no balcão.`
                  : '';
                ctx.aoRedesenhar();
              },
            }, [
              el('strong', { class: 'sugestao__rua' }, sugestao.rotulo),
              el('span', { class: 'sugestao__extra' }, sugestao.cep ? `CEP ${sugestao.cep}` : ''),
            ])
          );
        }
      }, 380);
    },
    onblur: () => setTimeout(() => { lista.hidden = true; }, 180),
  });
  return el('label', { class: 'entrada entrada--sugestao' }, [
    el('span', { class: 'entrada__rotulo' }, 'Rua'),
    entrada,
    lista,
  ]);
};

const etapaDados = (ctx: ContextoEtapa) => {
  const conta = contaAtual();
  const entrega = el('div', { class: 'entrada' }, [
    el('div', { class: 'alternador' }, [
      el('button', {
        type: 'button', class: `alternador__opcao${estado.modo === 'entrega' ? ' alternador__opcao--ativa' : ''}`,
        onclick: () => { estado.modo = 'entrega'; rascunho.definirModo('entrega'); ctx.aoRedesenhar(); },
      }, `Entrega · ${brl(taxaPara('entrega'))}`),
      el('button', {
        type: 'button', class: `alternador__opcao${estado.modo === 'retirada' ? ' alternador__opcao--ativa' : ''}`,
        onclick: () => { estado.modo = 'retirada'; rascunho.definirModo('retirada'); ctx.aoRedesenhar(); },
      }, 'Retirar no balcão'),
    ]),
  ]);

  const campos: any[] = [
    el('div', { class: 'linha-entradas' }, [
      campo('Nome de quem recebe', texto({
        value: estado.nome, placeholder: 'Maria Souza', autocomplete: 'name',
        oninput: (e: any) => { estado.nome = e.target.value; },
      })),
      campo('Celular', texto({
        value: estado.fone, placeholder: '(11) 90000-0000', inputmode: 'tel',
        oninput: (e: any) => { estado.fone = telefone(e.target.value); e.target.value = estado.fone; },
      })),
    ]),
  ];

  if (estado.modo === 'entrega') {
    if (estado.erroEntrega) {
      campos.push(el('p', { class: 'etapa__erro' }, estado.erroEntrega));
    } else if (estado.distanciaKm != null) {
      campos.push(
        el('p', { class: 'etapa__distancia' },
          `Endereço a ${estado.distanciaKm.toFixed(1).replace('.', ',')} km da pizzaria — dentro do raio de ${RAIO_ENTREGA_KM} km.`)
      );
    }
    campos.push(
      el('div', { class: 'linha-entradas linha-entradas--3' }, [
        campoCep(ctx),
        campoRua(ctx),
        campo('Número', texto({ value: estado.numero, placeholder: '512', oninput: (e: any) => { estado.numero = e.target.value; } })),
      ]),
      el('div', { class: 'linha-entradas' }, [
        campo('Complemento', texto({ value: estado.complemento, placeholder: 'apto 42', oninput: (e: any) => { estado.complemento = e.target.value; } })),
        campo('Bairro', texto({ value: estado.bairro, placeholder: 'Vila Madalena', oninput: (e: any) => { estado.bairro = e.target.value; } })),
      ])
    );
  }

  const blocoConta = conta
    ? el('section', { class: 'etapa__bloco' }, [
        el('h3', { class: 'etapa__subtitulo' }, 'Conta'),
        el('p', { class: 'etapa__apoio' }, `Pedindo como ${conta.nome}. O pedido entra no seu histórico.`),
      ])
    : el('section', { class: 'etapa__bloco' }, [
        el('h3', { class: 'etapa__subtitulo' }, 'Conta'),
        el('label', { class: 'marcador' }, [
          el('input', {
            type: 'checkbox', checked: estado.querConta,
            onchange: (e: any) => { estado.querConta = e.target.checked; ctx.aoRedesenhar(); },
          }),
          el('span', {}, 'Criar conta para guardar histórico, cupons e descontos exclusivos'),
        ]),
        el('p', { class: 'etapa__apoio' }, 'Sem conta você também acompanha seus pedidos — eles ficam salvos no servidor, ligados a este dispositivo. Com conta, ganha cupons e descontos nas próximas.'),
        estado.querConta
          ? el('div', { class: 'linha-entradas' }, [
              campo('E-mail ou celular', texto({
                value: estado.identificador, placeholder: 'voce@email.com',
                oninput: (e: any) => { estado.identificador = e.target.value; },
              })),
              campo('Senha', texto({
                type: 'password', value: estado.senha, placeholder: 'mínimo 6',
                oninput: (e: any) => { estado.senha = e.target.value; },
              })),
            ])
          : null,
      ]);

  return el('section', { class: 'etapa' }, [
    cabecalho(2, 'Seus dados', 'Quem recebe, onde e como o pedido chega.'),
    el('div', { class: 'etapa__grade' }, [
      el('div', { class: 'etapa__principal' }, [
        el('section', { class: 'etapa__bloco' }, [el('h3', { class: 'etapa__subtitulo' }, 'Entrega'), entrega, ...campos]),
        blocoConta,
      ]),
      resumoDoPedido(),
    ]),
  ]);
};

const qrDoPix = (url: string) => {
  const canvas = el('canvas', { class: 'pix__tela' });
  requestAnimationFrame(() => QR.draw(canvas, url, { size: 220, quiet: 3 }));
  return canvas;
};

const corpoPix = (ctx: ContextoEtapa) => {
  const id = criarCobrancaUnica('pix');
  const atual = cobranca(id);
  const url = `${urlDoDemo()}?pix=${id}`;
  const copia = el('input', {
    class: 'entrada__campo entrada__campo--codigo',
    readonly: true,
    value: pixCopiaECola({ valor: rascunho.total(), txid: `FDV${String(atual?.id || '').toUpperCase().slice(0, 12)}` }),
  });
  const confirmar = el('button', {
    type: 'button', class: 'botao botao--primario botao--largo',
    onclick: async (evento: any) => {
      evento.currentTarget.disabled = true;
      evento.currentTarget.textContent = 'Confirmando…';
      const resposta = await baixarCobranca(id, 'pix');
      if (resposta.ok) ctx.aoConcluir(resposta.pedidoId);
      else {
        evento.currentTarget.disabled = false;
        evento.currentTarget.textContent = 'Já paguei · confirmar';
        toast('Ainda não identificamos o pagamento.', 'erro');
      }
    },
  }, 'Já paguei · confirmar');

  return el('div', { class: 'pix' }, [
    el('div', { class: 'pix__quadro' }, [qrDoPix(url), el('span', { class: 'pix__nota' }, 'escaneie com o app do banco')]),
    el('div', { class: 'pix__lado' }, [
      el('p', { class: 'pix__valor' }, [el('strong', {}, brl(rascunho.total())), ' via PIX']),
      el('p', { class: 'etapa__apoio' }, 'O QR abre a página de pagamento deste pedido. Confirmado lá, o pedido cai aqui e no painel da loja.'),
      el('div', { class: 'pix__codigo' }, [
        copia,
        el('button', {
          type: 'button', class: 'botao botao--mini botao--fantasma',
          onclick: () => { copia.select(); navigator.clipboard?.writeText(copia.value); toast('Código copiado.'); },
        }, 'Copiar'),
      ]),
      confirmar,
      el('a', { class: 'link-discreto', href: url, target: '_blank', rel: 'noreferrer' }, 'Abrir a página de pagamento'),
    ]),
  ]);
};

const corpoCartao = (metodo: string, ctx: ContextoEtapa) => {
  const dados = { numero: '', nome: estado.nome.trim().toUpperCase(), validade: '', cvv: '' };
  const aviso = el('p', { class: 'etapa__erro' });
  const botao = el('button', {
    type: 'button', class: 'botao botao--primario botao--largo',
    onclick: async () => {
      aviso.textContent = '';
      const id = criarCobrancaUnica(metodo);
      botao.disabled = true;
      botao.textContent = 'Autorizando…';
      const autorizacao = await cobrarCartao(dados);
      if (!autorizacao.ok) {
        aviso.textContent = autorizacao.erro;
        botao.disabled = false;
        botao.textContent = `Pagar ${brl(rascunho.total())}`;
        return;
      }
      const baixa = await baixarCobranca(id, metodo);
      if (baixa.ok) ctx.aoConcluir(baixa.pedidoId, autorizacao);
      else {
        aviso.textContent = 'Não foi possível registrar o pedido.';
        botao.disabled = false;
        botao.textContent = `Pagar ${brl(rascunho.total())}`;
      }
    },
  }, `Pagar ${brl(rascunho.total())}`);

  return el('div', { class: 'cartao' }, [
    el('div', { class: 'cartao__topo' }, [
      el('span', {}, metodo === 'credito' ? 'Cartão de crédito' : 'Cartão de débito'),
      el('button', {
        type: 'button', class: 'botao botao--mini botao--fantasma',
        onclick: () => {
          dados.numero = CARTAO_TESTE.numero;
          dados.nome = CARTAO_TESTE.nome;
          dados.validade = CARTAO_TESTE.validade;
          dados.cvv = CARTAO_TESTE.cvv;
          const raiz = botao.closest('.cartao');
          (raiz?.querySelector('input[name="numero"]') as HTMLInputElement).value = dados.numero;
          (raiz?.querySelector('input[name="nome"]') as HTMLInputElement).value = dados.nome;
          (raiz?.querySelector('input[name="validade"]') as HTMLInputElement).value = dados.validade;
          (raiz?.querySelector('input[name="cvv"]') as HTMLInputElement).value = dados.cvv;
          toast('Cartão de teste preenchido.');
        },
      }, 'Usar cartão de teste'),
    ]),
    campo('Número', texto({
      name: 'numero', inputmode: 'numeric', placeholder: '0000 0000 0000 0000',
      oninput: (e: any) => { dados.numero = cartao(e.target.value); e.target.value = dados.numero; },
    })),
    campo('Nome impresso', texto({
      name: 'nome', placeholder: 'COMO ESTÁ NO CARTÃO', value: dados.nome,
      oninput: (e: any) => { dados.nome = e.target.value; },
    })),
    el('div', { class: 'linha-entradas' }, [
      campo('Validade', texto({
        name: 'validade', placeholder: 'MM/AA', inputmode: 'numeric',
        oninput: (e: any) => {
          const digitos = e.target.value.replace(/\D/g, '').slice(0, 4);
          dados.validade = digitos.replace(/(\d{2})(\d{0,2})/, '$1/$2').replace(/\/$/, '');
          e.target.value = dados.validade;
        },
      })),
      campo('CVV', texto({ name: 'cvv', placeholder: '123', inputmode: 'numeric', oninput: (e: any) => { dados.cvv = e.target.value; } })),
    ]),
    el('p', { class: 'etapa__apoio' }, 'Nada é cobrado de verdade: o cartão de teste é autorizado localmente.'),
    aviso,
    botao,
  ]);
};

const corpoDinheiro = (ctx: ContextoEtapa) => {
  const troco = el('input', { class: 'entrada__campo', inputmode: 'decimal', placeholder: '100,00' });
  const botao = el('button', {
    type: 'button', class: 'botao botao--primario botao--largo',
    onclick: async () => {
      botao.disabled = true;
      botao.textContent = 'Registrando…';
      const pedido = await criarPedido({
        canal: 'site',
        cliente: { nome: estado.nome.trim(), telefone: estado.fone },
        clienteId: await garantirCliente(),
        endereco: enderecoTexto(),
        itens: rascunho.itens(),
        subtotal: rascunho.subtotal(),
        taxa: rascunho.taxa(),
        desconto: rascunho.desconto(),
        total: rascunho.total(),
        tipo: estado.modo === 'retirada' ? 'retirada' : 'entrega',
        contaId: contaAtual()?.id || null,
        pagamento: { metodo: 'dinheiro', status: 'aguardando' },
        pagamentos: [],
      });
      toast('Pedido registrado — receba em dinheiro na entrega.');
      ctx.aoConcluir(pedido.id);
    },
  }, `Pedir e pagar ${brl(rascunho.total())} na entrega`);

  return el('div', { class: 'dinheiro' }, [
    el('p', { class: 'pix__valor' }, [el('strong', {}, brl(rascunho.total())), ' em dinheiro']),
    el('label', { class: 'entrada' }, [el('span', { class: 'entrada__rotulo' }, 'Troco para (opcional)'), troco]),
    el('p', { class: 'etapa__apoio' }, 'Sem gateway: o pedido entra na cozinha e o recebimento é registrado no caixa pelo atendente.'),
    botao,
  ]);
};

const etapaPagamento = (ctx: ContextoEtapa) => {
  const metodos = [
    { id: 'pix', nome: 'PIX' },
    { id: 'credito', nome: 'Crédito' },
    { id: 'debito', nome: 'Débito' },
    { id: 'dinheiro', nome: 'Dinheiro' },
  ];
  const conteudo = estado.pagamento === 'pix'
    ? corpoPix(ctx)
    : estado.pagamento === 'dinheiro'
      ? corpoDinheiro(ctx)
      : corpoCartao(estado.pagamento, ctx);

  return el('section', { class: 'etapa' }, [
    cabecalho(3, 'Pagamento', 'PIX na hora, cartão de teste ou dinheiro na entrega.'),
    el('div', { class: 'etapa__grade' }, [
      el('div', { class: 'etapa__principal' }, [
        el('div', { class: 'metodos' },
          metodos.map((metodo) =>
            el('button', {
              type: 'button',
              class: `metodo${estado.pagamento === metodo.id ? ' metodo--ativo' : ''}`,
              onclick: () => { estado.pagamento = metodo.id; ctx.aoRedesenhar(); },
            }, metodo.nome)
          )
        ),
        el('div', { class: 'pagamento' }, [conteudo]),
      ]),
      resumoDoPedido(),
    ]),
  ]);
};

export const renderEtapa = (numero: number, alvo: any, ctx: ContextoEtapa) => {
  const etapa = numero === 1 ? etapaBebidas(ctx) : numero === 2 ? etapaDados(ctx) : etapaPagamento(ctx);
  alvo.append(etapa);
};

export const reiniciarEtapas = () => {
  estado.cobrancaId = null;
  estado.clienteId = null;
  estado.pagamento = 'pix';
  estado.querConta = false;
};

const ESTAGIOS: Record<string, string[]> = {
  entrega: ['recebido', 'preparo', 'rota', 'entregue'],
  retirada: ['recebido', 'preparo', 'pronto', 'retirado'],
};

const NOME_ESTAGIO: Record<string, string> = {
  recebido: 'Pedido recebido',
  preparo: 'Em preparo',
  pronto: 'Pronto para retirada',
  rota: 'Saiu para entrega',
  entregue: 'Entregue',
  retirado: 'Retirado',
};

const DESCRICAO_ESTAGIO: Record<string, string> = {
  recebido: 'A cozinha recebeu o pedido',
  preparo: 'Massa aberta e forno aceso',
  pronto: 'Esperando você no balcão',
  rota: 'O entregador está a caminho',
  entregue: 'Bom apetite',
  retirado: 'Retirado no balcão',
};

let timerStatus: any = null;

export const pararRastreio = () => {
  if (timerStatus) clearInterval(timerStatus);
  timerStatus = null;
};

const trilhaDeStatus = (numero: number, inicial: any) => {
  const caixa = el('div', { class: 'status' });
  let pedido: any = inicial || porNumero(numero) || null;

  const desenhar = () => {
    limpar(caixa);
    if (!pedido) {
      caixa.append(el('p', { class: 'etapa__apoio' }, 'Não encontramos este pedido.'));
      return;
    }
    const estagios = ESTAGIOS[pedido.tipo === 'retirada' ? 'retirada' : 'entrega'];
    const atual = pedido.status === 'novo' ? 'recebido' : pedido.status;
    const posicao = Math.max(0, estagios.indexOf(atual));
    caixa.append(
      el('div', { class: 'status__topo' }, [
        el('strong', { class: 'status__atual' }, STATUS_PEDIDO[pedido.status]?.nome || NOME_ESTAGIO[atual] || 'Em andamento'),
        el('span', { class: 'status__nota' }, pedido.tipo === 'retirada' ? SITE.tempoRetirada + ' para retirar' : SITE.tempoEntrega + ' de entrega'),
      ]),
      el('ol', { class: 'status__lista' },
        estagios.map((estagio, indice) => {
          const feito = indice < posicao || (indice === posicao && ['entregue', 'retirado'].includes(atual));
          const agora = indice === posicao && !feito;
          return el('li', {
            class: `status__passo${feito ? ' status__passo--feito' : ''}${agora ? ' status__passo--agora' : ''}`,
          }, [
            el('span', { class: 'status__bolha' }, feito ? '✓' : String(indice + 1)),
            el('div', { class: 'status__texto' }, [
              el('strong', {}, NOME_ESTAGIO[estagio]),
              el('span', { class: 'status__descricao' }, DESCRICAO_ESTAGIO[estagio]),
            ]),
          ]);
        })
      )
    );
  };

  desenhar();
  pararRastreio();
  timerStatus = setInterval(async () => {
    if (!document.body.contains(caixa)) {
      pararRastreio();
      return;
    }
    const remotos = await pedidosDaSessao();
    const achado = remotos?.find((item) => item.numero === numero);
    if (achado && achado.status !== pedido?.status) {
      pedido = { ...pedido, status: achado.status, tipo: achado.tipo };
      desenhar();
    }
  }, 4000);
  return caixa;
};

export interface DadosConcluido {
  numero: number;
  id: string;
  tipo: string;
  pedido?: any;
}

export const renderConcluido = (alvo: any, dados: DadosConcluido, acoes: { aoNova: () => void; aoLoja: () => void }) => {
  alvo.append(
    el('section', { class: 'etapa conclusao' }, [
      el('div', { class: 'conclusao__cabecalho' }, [
        el('span', { class: 'conclusao__selo' }, '✓'),
        el('div', {}, [
          el('span', { class: 'etapa__indice' }, 'Pedido confirmado'),
          el('h2', { class: 'etapa__titulo' }, dados.id),
          el('p', { class: 'etapa__apoio' },
            dados.tipo === 'retirada'
              ? `Retirada no balcão em ${SITE.tempoRetirada}. A cozinha já recebeu.`
              : `Chega em ${SITE.tempoEntrega}. A cozinha já recebeu.`),
        ]),
      ]),
      el('div', { class: 'etapa__grade' }, [
        el('div', { class: 'etapa__principal' }, [trilhaDeStatus(dados.numero, dados.pedido)]),
        el('aside', { class: 'pedido' }, [
          el('h3', { class: 'pedido__titulo' }, 'Acompanhar depois'),
          el('p', { class: 'pedido__prazo' }, 'Este pedido fica salvo no servidor — volte em "Pedidos" para ver o status sem precisar de conta.'),
          el('button', {
            type: 'button', class: 'botao botao--primario botao--largo',
            onclick: () => acoes.aoNova(),
          }, 'Montar outra pizza'),
          el('button', {
            type: 'button', class: 'botao botao--fantasma botao--largo',
            onclick: () => abrirPedidosDoDispositivo(),
          }, 'Ver meus pedidos'),
          el('button', {
            type: 'button', class: 'botao botao--fantasma botao--largo',
            onclick: () => acoes.aoLoja(),
          }, 'Voltar à loja'),
        ]),
      ]),
    ])
  );
};
