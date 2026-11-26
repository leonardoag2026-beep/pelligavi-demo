export interface Fechamento {
  id: string;
  abertaEm: number | null;
  fechadaEm: number;
  valorInicial: number;
  esperado: number;
  contado: number;
  diferenca: number;
  observacao: string | null;
  porForma: Record<string, number>;
}

export interface CaixaEstado {
  aberto: boolean;
  id: string | null;
  valorInicial: number;
  abertaEm: number | null;
  pedidos: number;
  porForma: Record<string, number>;
  total: number;
  esperado: number;
  fechamentos: Fechamento[];
}

export interface AbrirCaixaRequest {
  valorInicial: number;
}

export interface FecharCaixaRequest {
  valorContado: number;
  observacao?: string | null;
}
