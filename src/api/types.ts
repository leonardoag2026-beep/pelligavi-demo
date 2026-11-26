export type TipoPedido = 'entrega' | 'retirada';

export interface ItemPedido {
  nome: string;
  detalhe?: string;
  qtd: number;
  preco: number;
  tipo?: string;
}

export interface Cliente {
  nome: string;
  telefone?: string | null;
}

export interface PagamentoItem {
  metodo: string;
  valor: number;
  em: number;
}

export interface HistoricoStatus {
  status: string;
  em: number;
  motivo?: string;
}

export interface Pedido {
  id: string;
  numero: number;
  canal: string;
  cliente: Cliente;
  endereco?: string | null;
  itens: ItemPedido[];
  subtotal: number;
  taxa: number;
  desconto: number;
  total: number;
  status: string;
  tipo: TipoPedido;
  observacao?: string | null;
  pagamento?: { metodo?: string; status?: string };
  pagamentos: PagamentoItem[];
  historico: HistoricoStatus[];
  motivoCancelamento?: string;
  contaId?: string | null;
  clienteId?: string | null;
  dispositivo?: string | null;
  criadoEm: number;
  atualizadoEm?: number;
  pago: boolean;
}

export interface Conta {
  id: string;
  nome: string;
  identificador: string;
  senha?: string;
  criadoEm?: number;
  demo?: boolean;
}

export interface Mensagem {
  de: string;
  texto: string;
  em: number;
  anexo?: string;
  tipo?: string;
}

export interface Conversa {
  id: string;
  canal: string;
  nome: string;
  pedido?: string;
  status: string;
  naoLidas: number;
  mensagens: Mensagem[];
  etapa?: string;
}

export interface Sabor {
  id: string;
  nome: string;
  precos: { p: number; m: number; g: number };
  itens: string[];
  ativo?: boolean;
  imagem?: string;
}

export interface Bebida {
  id: string;
  nome: string;
  volume: string;
  preco: number;
  tipo: string;
  estoque?: number;
  imagem?: string;
}

export interface Tamanho {
  id: string;
  nome: string;
  medida: string;
  fatias: number;
  fator: number;
}

export interface Borda {
  id: string;
  nome: string;
  preco: number;
  recheio: string | null;
}

export interface Extra {
  id: string;
  nome: string;
  preco: number;
}

export interface ItemCarrinho {
  nome: string;
  detalhe: string;
  qtd: number;
  preco: number;
  tipo?: string;
  id?: string;
  imagem?: string;
  cena?: any;
  arte?: string;
  toppings?: string[];
  partes?: number;
  tamanhoId?: string;
  bordaId?: string;
  gramas?: number;
}

export interface Funcionario {
  id: string;
  nome: string;
  turno: string;
  salario: number;
  cargo?: string;
}

export interface Custo {
  id: string;
  nome: string;
  categoria: string;
  valor: number;
  tipo: 'mensal' | 'imediato' | 'periodico';
  dias?: number;
}

export interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  texto: string;
  em: number;
  lida?: boolean;
  pedido?: string;
}

export interface LinkPagamento {
  code: string;
  valor: number;
  descricao: string;
  status: string;
  criadoEm: number;
}

export interface Cobranca {
  token: string;
  valor: number;
  descricao: string;
  status: string;
  criadoEm: number;
  pedido?: string;
  metodo?: string;
}
