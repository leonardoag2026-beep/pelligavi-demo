export interface ResumoPeriodo {
  pedidos: number;
  total: number;
  ticket: number;
  tempoMedio: number | null;
}

export interface VendaDia {
  dia: string;
  total: number;
  pedidos: number;
}

export interface TotalPorChave {
  metodo?: string;
  canal?: string;
  nome?: string;
  total: number;
  qtd?: number;
  pedidos?: number;
}

export interface Relatorio {
  periodo: { de: string | null; ate: string | null };
  resumo: ResumoPeriodo;
  vendasPorDia: VendaDia[];
  porFormaPagamento: TotalPorChave[];
  porCanal: TotalPorChave[];
  topItens: TotalPorChave[];
  comprasPorDia: { dia: string; total: number }[];
}

export interface GetRelatorioParams {
  de?: string;
  ate?: string;
  itens?: number;
}
