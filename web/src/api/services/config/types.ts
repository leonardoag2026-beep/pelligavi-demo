export interface FaixaDesconto {
  minimo: number;
  percentual: number;
}

export interface LojaConfig {
  taxaBase: number;
  metaFaturamento: number;
  nome: string;
  prazoEntregaMin: number;
  prazoEntregaMax: number;
  prazoRetiradaMin: number;
  prazoRetiradaMax: number;
  freteGratisAcima: number;
  raioEntregaKm: number;
  enderecoRetirada: string;
  faixas: FaixaDesconto[];
  textos: { chave: string; grupo: string; valor: string }[];
}

export type AtualizarConfigRequest = Partial<LojaConfig>;
