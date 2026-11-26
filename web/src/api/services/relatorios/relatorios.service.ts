import api from '../../axiosInstance';
import type { GetRelatorioParams, Relatorio } from './types';

export const relatoriosService = {
  getResumo: async (params?: GetRelatorioParams): Promise<Relatorio> => {
    const response = await api.get<Relatorio>('/api/relatorios/resumo', { params });
    return response.data;
  },
};

export default relatoriosService;
