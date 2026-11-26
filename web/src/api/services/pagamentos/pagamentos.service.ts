import api from '../../axiosInstance';
import type { Cobranca, NovaCobrancaRequest, NovoReembolsoRequest, Reembolso } from './types';

export const pagamentosService = {
  getCobrancas: async (limite?: number): Promise<Cobranca[]> => {
    const response = await api.get<Cobranca[]>('/api/pagamentos/cobrancas', { params: { limite } });
    return response.data;
  },

  getCobrancaByCodigo: async (codigo: string): Promise<Cobranca> => {
    const response = await api.get<Cobranca>(`/api/pagamentos/cobrancas/${codigo}`);
    return response.data;
  },

  criarCobranca: async (codigo: string, body: NovaCobrancaRequest): Promise<Cobranca> => {
    const response = await api.post<Cobranca>('/api/pagamentos/cobrancas', { codigo, ...body });
    return response.data;
  },

  pagarCobranca: async (codigo: string, body: { pedidoRef?: string | null; metodo?: string | null }): Promise<Cobranca> => {
    const response = await api.patch<Cobranca>(`/api/pagamentos/cobrancas/${codigo}/pagar`, body);
    return response.data;
  },

  getReembolsos: async (): Promise<{ dados: Reembolso[]; total: number; quantidade: number }> => {
    const response = await api.get<{ dados: Reembolso[]; total: number; quantidade: number }>('/api/pagamentos/reembolsos');
    return response.data;
  },

  criarReembolso: async (body: NovoReembolsoRequest): Promise<Reembolso> => {
    const response = await api.post<Reembolso>('/api/pagamentos/reembolsos', body);
    return response.data;
  },
};

export default pagamentosService;
