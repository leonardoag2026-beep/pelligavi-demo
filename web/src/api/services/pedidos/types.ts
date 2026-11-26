export type StatusPedido = 'recebido' | 'preparo' | 'pronto' | 'rota' | 'entregue' | 'retirado' | 'cancelado' | 'reembolsado';

export interface ItemPedido {
  nome: string;
  detalhe?: string | null;
  qtd: number;
  preco: number;
  tipo?: string | null;
  // sabor de cada parte + ingredientes: o que a cozinha precisa para montar
  composicao?: string[];
}

export interface PagamentoPedido {
  metodo: string;
  valor: number;
  status: string;
  em: number;
}

export interface HistoricoPedido {
  status: StatusPedido;
  em: number;
  motivo: string | null;
}

export interface Pedido {
  id: string;
  numero: number;
  canal: string;
  cliente: { nome: string; telefone: string | null };
  endereco: string | null;
  itens: ItemPedido[];
  subtotal: number;
  taxa: number;
  desconto: number;
  total: number;
  status: StatusPedido;
  tipo: 'entrega' | 'retirada' | 'balcao';
  observacao: string | null;
  pagamentos: PagamentoPedido[];
  historico: HistoricoPedido[];
  dispositivo: string | null;
  contaRef: string | null;
  criadoEm: string;
  atualizadoEm?: string | null;
}

// o cliente diz o que quer; nome e preço de cada item saem do banco
export type ItemPedidoEntrada =
  | {
      tipo: 'pizza';
      tamanho: string;
      sabor?: string | null;
      sabores?: (string | null)[];
      borda?: string | null;
      ingredientes?: { slug: string; porcoes: number }[];
      partes?: number;
      partesInfo?: { sabor?: string | null; ingredientes?: { slug: string; porcoes: number }[] }[];
    }
  | { tipo: 'bebida' | 'extra'; slug: string; qtd: number };

export interface Orcamento {
  itens: ItemPedido[];
  subtotal: number;
  taxa: number;
  desconto: number;
  total: number;
}

export interface CriarPedidoRequest {
  canal: string;
  cliente: { nome: string; telefone?: string | null };
  endereco?: string | null;
  itens: ItemPedidoEntrada[];
  cobranca?: string | null;
  tipo: 'entrega' | 'retirada' | 'balcao';
  contaRef?: string | null;
  dispositivo?: string | null;
  contatoToken?: string | null;
  observacao?: string | null;
  pagamento: { metodo: string; status: string };
}

export interface AlterarStatusRequest {
  status: Exclude<StatusPedido, 'reembolsado'>;
  motivo?: string | null;
}
