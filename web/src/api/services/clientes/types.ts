export interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  enderecos: string[];
  criadoEm: number;
  anonimizado: boolean;
}

export interface SalvarClienteRequest {
  nome: string;
  telefone?: string | null;
  endereco?: string | null;
}

export interface ClienteDoCheckoutRequest extends SalvarClienteRequest {
  contaRef?: string | null;
}
