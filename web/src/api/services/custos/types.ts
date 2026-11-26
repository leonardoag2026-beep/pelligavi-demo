export type TipoConta = 'mensal' | 'imediato' | 'periodico';

export interface Conta {
  id: number;
  nome: string;
  categoria: string;
  valor: number;
  tipo: TipoConta;
  intervaloDias: number | null;
  diaVencimento: number | null;
  dataInicio: string;
  dataFim: string | null;
  repeticoes: number | null;
  icone: string;
  ativo: boolean;
  vigente: boolean;
  mensalEquivalente: number;
}

export interface NovaContaRequest {
  nome: string;
  categoria: string;
  valor: number;
  tipo: TipoConta;
  intervaloDias?: number | null;
  diaVencimento?: number | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  repeticoes?: number | null;
  icone?: string;
}

export interface Compra {
  id: number;
  ingredienteId: number;
  ingrediente: string;
  slug: string;
  gramas: number;
  valorTotal: number;
  custoKgPago: number;
  custoKgCadastrado: number;
  fornecedor: string | null;
  compradaEm: string;
  variacao: number;
}

export interface NovaCompraRequest {
  slug: string;
  gramas: number;
  valorTotal: number;
  fornecedor?: string | null;
  compradaEm?: string | null;
}

export interface ResumoCustos {
  mensal: number;
  imediato: number;
  contas: number;
  compras: number;
  compras30d: number;
}
