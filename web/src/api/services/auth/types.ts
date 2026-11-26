export interface LoginGerenteRequest {
  email: string;
  senha: string;
}

export interface Gerente {
  id: number;
  nome: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  gerente: Gerente;
}

export interface ContaCliente {
  id: string;
  nome: string;
  email: string | null;
  celular: string | null;
}

export interface LoginClienteRequest {
  identificador: string;
  senha: string;
}

export interface RegistroClienteRequest {
  nome: string;
  identificador: string;
  senha: string;
}
