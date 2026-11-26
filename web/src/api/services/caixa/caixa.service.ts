import api from '../../axiosInstance';
import type { AbrirCaixaRequest, CaixaEstado, Fechamento, FecharCaixaRequest } from './types';

export const caixaService = {
  getEstado: async (): Promise<CaixaEstado> => {
    const response = await api.get<CaixaEstado>('/api/caixa');
    return response.data;
  },

  abrir: async (body: AbrirCaixaRequest): Promise<CaixaEstado> => {
    const response = await api.post<CaixaEstado>('/api/caixa/abrir', body);
    return response.data;
  },

  fechar: async (body: FecharCaixaRequest): Promise<Fechamento> => {
    const response = await api.post<Fechamento>('/api/caixa/fechar', body);
    return response.data;
  },
};

export default caixaService;
