import { atual } from '../storage.js';
import type { PagamentoItem, Pedido } from '../types.js';

export interface Fechamento {
  id: string;
  abertaEm: number | null;
  fechadaEm: number;
  valorInicial: number;
  porForma: Record<string, number>;
  total: number;
  esperado: number;
  contado: number;
  diferenca: number;
  observacao: string | null;
}

export interface CaixaEstado {
  aberto: boolean;
  valorInicial: number;
  abertaEm: number | null;
  pedidos?: number;
  porForma?: Record<string, number>;
  total?: number;
  esperado?: number;
  fechamentos: Fechamento[];
  ultimoFechamento?: Fechamento;
}

export interface CaixaResumoCaixa extends CaixaEstado {
  pedidos: number;
  porForma: Record<string, number>;
  total: number;
  esperado: number;
}

// o caixa vive no banco (tabela caixa + pagamento dos pedidos); o front só guarda
// a última leitura para as telas que consultam de forma síncrona
const VAZIO: CaixaResumoCaixa = {
  aberto: false,
  valorInicial: 0,
  abertaEm: null,
  pedidos: 0,
  porForma: {},
  total: 0,
  esperado: 0,
  fechamentos: [],
};

let ESTADO: CaixaResumoCaixa = { ...VAZIO };

// o banco guarda o nome da forma ("Cartao de credito"); a tela usa a chave curta
const CHAVE_FORMA: Record<string, string> = {
  'PIX': 'pix',
  'Dinheiro': 'dinheiro',
  'Cartao de credito': 'cartao',
  'Cartao de debito': 'debito',
};

const normalizarFormas = (porForma: Record<string, number> | undefined): Record<string, number> => {
  const saida: Record<string, number> = {};
  for (const [forma, valor] of Object.entries(porForma || {})) {
    saida[CHAVE_FORMA[forma] ?? forma.toLowerCase()] = valor;
  }
  return saida;
};

const doServidor = (bruto: any): CaixaResumoCaixa => ({
  aberto: Boolean(bruto.aberto),
  valorInicial: bruto.valorInicial ?? 0,
  abertaEm: bruto.abertaEm ?? null,
  pedidos: bruto.pedidos ?? 0,
  porForma: normalizarFormas(bruto.porForma),
  total: bruto.total ?? 0,
  esperado: bruto.esperado ?? 0,
  fechamentos: (bruto.fechamentos || []).map((f: any) => ({ ...f, porForma: normalizarFormas(f.porForma) })),
});

export const carregarCaixa = async (): Promise<void> => {
  const resposta = await fetch('/api/caixa', { credentials: 'same-origin' });
  if (!resposta.ok) throw new Error(`API /caixa: ${resposta.status}`);
  ESTADO = doServidor(await resposta.json());
};

export const caixa = (): CaixaEstado => ({ ...ESTADO, ultimoFechamento: ESTADO.fechamentos[0] });

const pedidos = (): Pedido[] => (atual({ pedidos: [] }).pedidos as Pedido[]) || [];

export const pagamentosDoPedido = (pedido: Pedido): PagamentoItem[] => {
  if (Array.isArray(pedido.pagamentos) && pedido.pagamentos.length) return pedido.pagamentos;
  if (pedido.pagamento?.metodo) return [{ metodo: pedido.pagamento.metodo, valor: pedido.total, em: pedido.criadoEm }];
  return [];
};

export const resumo = (): CaixaResumoCaixa => ESTADO;

export const abrir = async (valorInicial: number): Promise<CaixaEstado> => {
  const valor = Math.max(0, Math.round(Number(valorInicial) || 0));
  const resposta = await fetch('/api/caixa/abrir', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valorInicial: valor }),
  });
  if (!resposta.ok) throw new Error(`API /caixa/abrir: ${resposta.status}`);
  ESTADO = doServidor(await resposta.json());
  return caixa();
};

export const fechar = async (valorContado: number, observacao = ''): Promise<Fechamento> => {
  const contado = Math.max(0, Math.round(Number(valorContado) || 0));
  const resposta = await fetch('/api/caixa/fechar', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valorContado: contado, observacao }),
  });
  if (!resposta.ok) throw new Error(`API /caixa/fechar: ${resposta.status}`);
  ESTADO = doServidor(await resposta.json());
  if (!ESTADO.fechamentos.length) throw new Error('Fechamento não retornado pelo servidor');
  return ESTADO.fechamentos[0]!;
};

export const pedidosDoPeriodo = (): Pedido[] => pedidos();
