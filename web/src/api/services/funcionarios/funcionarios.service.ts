import api from '../../axiosInstance';
import type {
  AtualizarFuncionarioRequest,
  CriarFuncionarioRequest,
  Funcionario,
  FuncionariosResponse,
  ResumoFuncionarios,
} from './types';

export const funcionariosService = {
  getFuncionarios: async (incluirInativos = false): Promise<FuncionariosResponse> => {
    const response = await api.get<FuncionariosResponse>('/api/funcionarios', {
      params: { inativos: incluirInativos ? 'true' : undefined },
    });
    return response.data;
  },

  getResumo: async (): Promise<ResumoFuncionarios> => {
    const response = await api.get<ResumoFuncionarios>('/api/funcionarios/resumo');
    return response.data;
  },

  criar: async (body: CriarFuncionarioRequest): Promise<Funcionario> => {
    const response = await api.post<Funcionario>('/api/funcionarios', body);
    return response.data;
  },

  atualizar: async (id: number, body: AtualizarFuncionarioRequest): Promise<Funcionario> => {
    const response = await api.put<Funcionario>(`/api/funcionarios/${id}`, body);
    return response.data;
  },

  remover: async (id: number): Promise<void> => {
    await api.delete(`/api/funcionarios/${id}`);
  },
};

export default funcionariosService;
