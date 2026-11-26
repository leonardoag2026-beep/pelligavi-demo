import { NaoEncontradoError } from '../../../shared/errors/app-error.js';
import funcionarioRepository, { type FuncionarioLinha } from '../repositories/funcionario.repository.js';

export interface ResumoFuncionarios {
  total: number;
  folha: number;
  porCargo: { cargo: string; total: number }[];
}

export const funcionarioService = {
  listar: async (incluirInativos = false): Promise<{ itens: FuncionarioLinha[]; folha: number }> => {
    const [itens, folha] = await Promise.all([
      funcionarioRepository.listar(incluirInativos),
      funcionarioRepository.folha(),
    ]);
    return { itens, folha };
  },

  porId: async (id: number): Promise<FuncionarioLinha> => {
    const linha = await funcionarioRepository.porId(id);
    if (!linha) throw new NaoEncontradoError(`Funcionário ${id} não encontrado`);
    return linha;
  },

  criar: async (dados: {
    nome: string;
    cargo: string;
    turno: string;
    salario: number;
    periodicidade?: string;
    diaPagamento?: number | null;
    dataFim?: string | null;
    telefone?: string | null;
    admissao?: string | null;
  }): Promise<FuncionarioLinha> => funcionarioRepository.criar({
    nome: dados.nome,
    cargo: dados.cargo,
    turno: dados.turno,
    salario: dados.salario,
    periodicidade: dados.periodicidade ?? 'mensal',
    diaPagamento: dados.diaPagamento ?? null,
    dataFim: dados.dataFim ?? null,
    telefone: dados.telefone ?? null,
    admissao: dados.admissao ?? null,
  }),

  atualizar: async (id: number, dados: Parameters<typeof funcionarioRepository.atualizar>[1]) =>
    funcionarioRepository.atualizar(id, dados),

  remover: async (id: number): Promise<void> => {
    const removidos = await funcionarioRepository.remover(id);
    if (!removidos) throw new NaoEncontradoError(`Funcionário ${id} não encontrado`);
  },

  resumo: async (): Promise<ResumoFuncionarios> => {
    const itens = await funcionarioRepository.listar(false);
    const porCargo = new Map<string, number>();
    itens.forEach((f) => porCargo.set(f.cargo, (porCargo.get(f.cargo) || 0) + 1));
    return {
      total: itens.length,
      folha: itens.reduce((s, f) => s + f.salario, 0),
      porCargo: [...porCargo.entries()].map(([cargo, total]) => ({ cargo, total })),
    };
  },
};

export default funcionarioService;
