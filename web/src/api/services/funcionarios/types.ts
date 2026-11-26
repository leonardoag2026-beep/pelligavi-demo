export type CargoFuncionario = 'atendente' | 'pizzaiolo' | 'entregador' | 'caixa' | 'gerente';

export type Periodicidade = 'mensal' | 'quinzenal' | 'semanal' | 'diario';

export interface Funcionario {
  id: number;
  nome: string;
  cargo: CargoFuncionario;
  turno: string;
  /** valor POR pagamento */
  salario: number;
  periodicidade: Periodicidade;
  diaPagamento: number | null;
  dataFim: string | null;
  /** salário normalizado para o mês (salario * 30 / ciclo) */
  mensalEquivalente: number;
  telefone: string | null;
  admissao: string | null;
  ativo: boolean;
}

export interface FuncionariosResponse {
  dados: Funcionario[];
  folha: number;
}

export interface ResumoFuncionarios {
  total: number;
  folha: number;
  porCargo: { cargo: string; total: number }[];
}

export interface CriarFuncionarioRequest {
  nome: string;
  cargo?: CargoFuncionario;
  turno?: string;
  salario: number;
  periodicidade?: Periodicidade;
  diaPagamento?: number | null;
  dataFim?: string | null;
  telefone?: string | null;
  admissao?: string | null;
}

export type AtualizarFuncionarioRequest = Partial<CriarFuncionarioRequest> & { ativo?: boolean };
