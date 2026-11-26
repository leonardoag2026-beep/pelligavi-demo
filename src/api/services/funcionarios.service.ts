export interface Funcionario {
  id: number;
  nome: string;
  cargo: string;
  turno: string;
  salario: number;
  telefone: string | null;
  admissao: string | null;
  ativo: boolean;
}

export interface Equipe {
  itens: Funcionario[];
  folha: number;
}

const pedir = async (caminho: string, init?: RequestInit): Promise<any> => {
  const resposta = await fetch(caminho, { credentials: 'same-origin', ...init });
  if (!resposta.ok) throw new Error(`API ${caminho}: ${resposta.status}`);
  return resposta.status === 204 ? null : resposta.json();
};

// a equipe vive no banco (tabela funcionario)
export const carregarEquipe = async (): Promise<Equipe> => {
  const corpo = await pedir('/api/funcionarios');
  return { itens: corpo.dados || [], folha: corpo.folha || 0 };
};

export const criarFuncionario = async (dados: {
  nome: string;
  turno: string;
  salario: number;
  cargo?: string;
}): Promise<Funcionario> =>
  pedir('/api/funcionarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: dados.nome,
      turno: dados.turno,
      salario: dados.salario,
      cargo: dados.cargo || 'atendente',
    }),
  });

export const atualizarFuncionario = async (id: number, mudanca: Partial<Funcionario>): Promise<Funcionario> =>
  pedir(`/api/funcionarios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mudanca),
  });

export const removerFuncionario = async (id: number): Promise<void> => {
  await pedir(`/api/funcionarios/${id}`, { method: 'DELETE' });
};

export const resumoEquipe = async (): Promise<{ total: number; folha: number; porCargo: { cargo: string; total: number }[] }> =>
  pedir('/api/funcionarios/resumo');
