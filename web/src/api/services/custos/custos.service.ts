import api from '../../axiosInstance';
import type { Compra, Conta, NovaCompraRequest, NovaContaRequest, ResumoCustos } from './types';

export const custosService = {
  getContas: async (): Promise<Conta[]> => {
    const response = await api.get<Conta[]>('/api/custos/contas');
    return response.data;
  },

  criarConta: async (body: NovaContaRequest): Promise<Conta> => {
    const response = await api.post<Conta>('/api/custos/contas', body);
    return response.data;
  },

  atualizarConta: async (id: number, body: NovaContaRequest): Promise<Conta> => {
    const response = await api.put<Conta>(`/api/custos/contas/${id}`, body);
    return response.data;
  },

  removerConta: async (id: number): Promise<void> => {
    await api.delete(`/api/custos/contas/${id}`);
  },

  getCompras: async (): Promise<Compra[]> => {
    const response = await api.get<Compra[]>('/api/custos/compras');
    return response.data;
  },

  criarCompra: async (body: NovaCompraRequest): Promise<Compra> => {
    const response = await api.post<Compra>('/api/custos/compras', body);
    return response.data;
  },

  getResumo: async (): Promise<ResumoCustos> => {
    const response = await api.get<ResumoCustos>('/api/custos/resumo');
    return response.data;
  },
};

export default custosService;
