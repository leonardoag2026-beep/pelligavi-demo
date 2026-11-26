import type { ItemPedidoEntrada } from '../pedidos/types';

export interface Cobranca {
  id: string;
  valor: number;
  subtotal: number;
  taxa: number;
  desconto: number;
  tipo: string;
  metodo: string;
  status: 'aguardando' | 'pago' | 'cancelado' | 'expirado';
  cliente: { nome: string; telefone: string | null };
  endereco: string | null;
  contaRef: string | null;
  clienteRef: string | null;
  itens: { nome: string; detalhe?: string | null; qtd: number; preco: number; tipo?: string | null }[];
  pedidoRef: string | null;
  criadoEm: string;
  pagoEm: string | null;
}

export interface NovaCobrancaRequest {
  // valor/taxa/desconto saem do servidor; a avulsa é o único valor digitado (balcão)
  avulsa?: { descricao: string; valor: number };
  tipo: string;
  metodo: string;
  cliente: { nome: string; telefone?: string | null };
  endereco?: string | null;
  contaRef?: string | null;
  clienteRef?: string | null;
  itens: ItemPedidoEntrada[];
}

export interface Reembolso {
  id: number;
  valor: number;
  motivo: string;
  pedidoRef: string | null;
  criadoEm: string;
}

export interface NovoReembolsoRequest {
  valor: number;
  motivo?: string | null;
  pedidoRef?: string | null;
}
