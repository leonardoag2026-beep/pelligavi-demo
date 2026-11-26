import { atual, salvar } from '../storage.js';
import type { ItemPedido, PagamentoItem, Pedido } from '../types.js';
import { criar as criarPedido } from './orders.service.js';

const ESPERA = (ms: number): Promise<void> => new Promise((ok) => setTimeout(ok, ms));

export const CARTAO_TESTE = {
  numero: '4111 1111 1111 1111',
  nome: 'LEONARDO A GUIMARAES',
  validade: '12/29',
  cvv: '123',
};

export const soDigitos = (valor: unknown): string => String(valor).replace(/\D/g, '');

export const luhn = (numero: string): boolean => {
  const d = soDigitos(numero);
  if (d.length < 13 || d.length > 19) return false;
  let soma = 0;
  let dobro = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (dobro) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
    dobro = !dobro;
  }
  return soma % 10 === 0;
};

export const bandeira = (numero: string): string | null => {
  const d = soDigitos(numero);
  if (/^4/.test(d)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'Amex';
  if (/^(606282|3841)/.test(d)) return 'Hipercard';
  if (/^(4011|4312|4389|5067|5090|6277|6362|6505|6516)/.test(d)) return 'Elo';
  return null;
};

export const validadeOk = (valor: string): boolean => {
  const m = String(valor).match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const mes = Number(m[1]);
  const ano = 2000 + Number(m[2]);
  if (mes < 1 || mes > 12) return false;
  const hoje = new Date();
  return ano > hoje.getFullYear() || (ano === hoje.getFullYear() && mes >= hoje.getMonth() + 1);
};

const codigo = (): string => {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => letras[Math.floor(Math.random() * letras.length)]).join('');
};

export const urlDoDemo = (): string => {
  const url = new URL(window.location.href);
  return `${url.origin}${url.pathname}`;
};

export const pixDoPedido = (pedido: Pedido): string =>
  `${urlDoDemo()}?pix=${pedido.numero}&v=${pedido.total}`;

const crc16 = (texto: string): string => {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

const campo = (id: string, valor: string): string => `${id}${String(valor.length).padStart(2, '0')}${valor}`;

export interface PixEmv {
  valor: number;
  txid: string;
}

export const pixCopiaECola = ({ valor, txid }: PixEmv): string => {
  const chave = 'pagamentos@fornodavila.com.br';
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', chave);
  const valorTxt = (valor / 100).toFixed(2);
  const corpo =
    campo('00', '01') +
    campo('26', conta) +
    campo('52', '0000') +
    campo('53', '986') +
    campo('54', valorTxt) +
    campo('58', 'BR') +
    campo('59', 'FORNO DA VILA') +
    campo('60', 'SAO PAULO') +
    campo('62', campo('05', txid));
  const base = corpo + '6304';
  return base + crc16(base);
};

export interface CobrancaPix {
  numero: number;
  valor: number;
  copiaECola: string;
  url: string;
}

export const criarCobrancaPix = (pedido: Pedido): CobrancaPix => ({
  numero: pedido.numero,
  valor: pedido.total,
  copiaECola: pixCopiaECola({ valor: pedido.total, txid: `PLG${pedido.numero}` }),
  url: pixDoPedido(pedido),
});

export const confirmarPix = async (numero: string | number): Promise<{ ok: true; numero: number; em: number }> => {
  await ESPERA(900);
  return { ok: true, numero: Number(numero), em: Date.now() };
};

export interface CartaoDados {
  numero: string;
  nome: string;
  validade: string;
  cvv: string;
}

export type ResultadoCartao =
  | { ok: true; autorizacao: string; bandeira: string | null; final: string }
  | { ok: false; erro: string };

export const cobrarCartao = async (dados: CartaoDados): Promise<ResultadoCartao> => {
  if (!luhn(dados.numero)) return { ok: false, erro: 'Número do cartão inválido.' };
  if (!bandeira(dados.numero)) return { ok: false, erro: 'Bandeira não reconhecida.' };
  if (!validadeOk(dados.validade)) return { ok: false, erro: 'Validade vencida ou incompleta.' };
  if (soDigitos(dados.cvv).length < 3) return { ok: false, erro: 'CVV incompleto.' };
  if (dados.nome.trim().length < 5) return { ok: false, erro: 'Nome como está no cartão.' };
  await ESPERA(1600);
  return {
    ok: true,
    autorizacao: codigo(),
    bandeira: bandeira(dados.numero),
    final: soDigitos(dados.numero).slice(-4),
  };
};

const token = (): string => Math.random().toString(36).slice(2, 10);

export interface DadosCobranca {
  total: number;
  itens: ItemPedido[];
  subtotal: number;
  taxa: number;
  desconto?: number;
  modo: string;
  cliente: { nome: string; telefone?: string | null };
  endereco?: string | null;
  contaId?: string | null;
  metodo?: string;
  clienteId?: string | null;
}

export interface Cobranca {
  id: string;
  valor: number;
  itens: ItemPedido[];
  subtotal: number;
  taxa: number;
  desconto: number;
  tipo: string;
  cliente: { nome: string; telefone?: string | null };
  endereco?: string | null;
  modo: string;
  contaId?: string | null;
  clienteId?: string | null;
  metodo: string;
  status: string;
  criadoEm: number;
  pedidoId?: string;
}

export const criarCobranca = (dados: DadosCobranca): string => {
  const id = token();
  const nova: Cobranca = {
    id,
    valor: dados.total,
    itens: dados.itens,
    subtotal: dados.subtotal,
    taxa: dados.taxa,
    desconto: dados.desconto || 0,
    tipo: dados.modo === 'retirada' ? 'retirada' : 'entrega',
    cliente: dados.cliente,
    endereco: dados.endereco,
    modo: dados.modo,
    contaId: dados.contaId || null,
    clienteId: dados.clienteId || null,
    metodo: dados.metodo || 'pix',
    status: 'aguardando',
    criadoEm: Date.now(),
  };
  guardar(nova);
  void fetch('/api/pagamentos/cobrancas', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      codigo: id,
      valor: nova.valor,
      subtotal: nova.subtotal,
      taxa: nova.taxa,
      desconto: nova.desconto,
      tipo: nova.tipo === 'retirada' ? 'retirada' : 'entrega',
      metodo: nova.metodo,
      cliente: { nome: nova.cliente.nome, telefone: nova.cliente.telefone ?? null },
      endereco: nova.endereco ?? null,
      contaRef: nova.contaId,
      clienteRef: nova.clienteId,
      itens: nova.itens.map((i) => ({ nome: i.nome, detalhe: i.detalhe ?? null, qtd: i.qtd, preco: i.preco, tipo: i.tipo ?? null })),
    }),
  }).catch(() => undefined);
  return id;
};

// cobranças vivem no banco (tabela cobranca) e chegam por carregarCobrancas()
const COBRANCAS: Cobranca[] = [];

const doServidor = (bruto: any): Cobranca => ({
  id: bruto.id,
  valor: bruto.valor,
  itens: bruto.itens || [],
  subtotal: bruto.subtotal,
  taxa: bruto.taxa,
  desconto: bruto.desconto,
  tipo: bruto.tipo,
  cliente: bruto.cliente,
  endereco: bruto.endereco,
  modo: bruto.tipo,
  contaId: bruto.contaRef,
  clienteId: bruto.clienteRef,
  metodo: bruto.metodo,
  status: bruto.status,
  criadoEm: new Date(bruto.criadoEm).getTime(),
  pedidoId: bruto.pedidoRef || undefined,
});

const guardar = (cobrancaNova: Cobranca): void => {
  const indice = COBRANCAS.findIndex((c) => c.id === cobrancaNova.id);
  if (indice >= 0) COBRANCAS[indice] = cobrancaNova;
  else COBRANCAS.unshift(cobrancaNova);
};

export const carregarCobrancas = async (): Promise<void> => {
  const resposta = await fetch('/api/pagamentos/cobrancas?limite=100', { credentials: 'same-origin' });
  // 401 = painel fechado; a lista de cobranças é do gerente, a página do PIX busca por código
  if (resposta.status === 401) return;
  if (!resposta.ok) throw new Error(`API /pagamentos/cobrancas: ${resposta.status}`);
  const lista = ((await resposta.json()) as any[]).map(doServidor);
  COBRANCAS.splice(0, COBRANCAS.length, ...lista);
};

/** Busca uma cobrança direto na API (link do PIX aberto em outro navegador). */
export const garantirCobranca = async (codigo: string): Promise<Cobranca | undefined> => {
  const emCache = cobranca(codigo);
  if (emCache) return emCache;
  const resposta = await fetch(`/api/pagamentos/cobrancas/${encodeURIComponent(codigo)}`, { credentials: 'same-origin' });
  if (!resposta.ok) return undefined;
  const nova = doServidor(await resposta.json());
  guardar(nova);
  return nova;
};

export const cobranca = (id: string): Cobranca | undefined =>
  COBRANCAS.find((c) => c.id === id);

export interface ResultadoBaixa {
  ok: boolean;
  pedidoId?: string;
  erro?: string;
}

export const baixarCobranca = async (id: string, metodo?: string): Promise<ResultadoBaixa> => {
  const alvo = cobranca(id);
  if (!alvo) return { ok: false, erro: 'Cobrança não encontrada.' };
  if (alvo.status === 'pago') return { ok: true, pedidoId: alvo.pedidoId };
  await ESPERA(700);
  const pedido = await criarPedido({
    canal: 'site',
    cliente: alvo.cliente,
    endereco: alvo.endereco,
    itens: alvo.itens,
    subtotal: alvo.subtotal,
    taxa: alvo.taxa,
    desconto: alvo.desconto || 0,
    total: alvo.valor,
    tipo: alvo.tipo === 'retirada' ? 'retirada' : 'entrega',
    clienteId: alvo.clienteId || null,
    contaId: alvo.contaId,
    pagamento: { metodo: metodo || alvo.metodo, status: 'pago' },
  });
  guardar({ ...alvo, status: 'pago', pedidoId: pedido.id });
  void fetch(`/api/pagamentos/cobrancas/${encodeURIComponent(id)}/pagar`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pedidoRef: pedido.id, metodo: metodo || alvo.metodo }),
  }).catch(() => undefined);
  return { ok: true, pedidoId: pedido.id };
};

export interface LinkCriado {
  code: string;
  valor: number;
  descricao: string;
  status: string;
  criadoEm: number;
}

export const criarLink = ({ valor, descricao }: { valor: number; descricao?: string }): LinkCriado => {
  salvar((estado) => ({
    ...estado,
    links: [
      {
        code: `PLG-${codigo()}`,
        valor: Number(valor),
        descricao: descricao || 'Cobrança avulsa',
        status: 'aguardando',
        criadoEm: Date.now(),
      },
      ...(estado.links || []),
    ],
  }));
  return (atual({ links: [] }).links as LinkCriado[])[0]!;
};

export const links = (): LinkCriado[] => (atual({ links: [] }).links as LinkCriado[]) || [];

export const marcarLinkPago = (code: string): void => {
  salvar((estado) => ({
    ...estado,
    links: ((estado.links || []) as LinkCriado[]).map((l) => (l.code === code ? { ...l, status: 'pago' } : l)),
  }));
};

const METODOS = ['dinheiro', 'cartao', 'pix', 'debito'];

export interface ResultadoPagamento {
  pagamentos: PagamentoItem[];
  pago: number;
  falta: number;
}

export const registrarPagamento = (numero: number, { metodo, valor }: { metodo: string; valor: number }): ResultadoPagamento | null => {
  if (!METODOS.includes(metodo)) throw new Error('Forma de pagamento inválida');
  const quantia = Math.round(Number(valor) || 0);
  if (quantia <= 0) throw new Error('Valor do pagamento deve ser positivo');
  let resultado: ResultadoPagamento | null = null;
  salvar((estado) => ({
    ...estado,
    pedidos: ((estado.pedidos || []) as Pedido[]).map((p) => {
      if (p.numero !== Number(numero)) return p;
      const pagamentos = [...(p.pagamentos || []), { metodo, valor: quantia, em: Date.now() }];
      const pago = pagamentos.reduce((s, pg) => s + pg.valor, 0);
      resultado = { pagamentos, pago, falta: Math.max(0, p.total - pago) };
      return {
        ...p,
        pagamentos,
        pagamento: { metodo, status: pago >= p.total ? 'pago' : 'parcial' },
      };
    }),
  }));
  return resultado;
};

export const saldoDoPedido = (pedido: Pedido): { pago: number; falta: number; quitado: boolean } => {
  const pago = (pedido.pagamentos || []).reduce((s, pg) => s + pg.valor, 0);
  return { pago, falta: Math.max(0, pedido.total - pago), quitado: pago >= pedido.total };
};

export const quitar = (numero: number): ResultadoPagamento | null => {
  const base = (atual({ pedidos: [] }).pedidos as Pedido[]) || [];
  const alvo = base.find((p) => p.numero === Number(numero));
  if (!alvo) throw new Error('Pedido não encontrado');
  const { falta } = saldoDoPedido(alvo);
  if (falta <= 0) return null;
  return registrarPagamento(numero, { metodo: alvo.pagamento?.metodo || 'dinheiro', valor: falta });
};

export const paymentService = {
  CARTAO_TESTE,
  luhn,
  bandeira,
  validadeOk,
  criarCobrancaPix,
  confirmarPix,
  cobrarCartao,
  criarLink,
  links,
  marcarLinkPago,
  registrarPagamento,
  saldoDoPedido,
  quitar,
};
