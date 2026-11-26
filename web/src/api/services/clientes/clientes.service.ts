import api from '../../axiosInstance';
import type { Cliente, ClienteDoCheckoutRequest, SalvarClienteRequest } from './types';

export const clientesService = {
  getClientes: async (busca?: string): Promise<Cliente[]> => {
    const response = await api.get<Cliente[]>('/api/clientes', { params: { busca } });
    return response.data;
  },

  getClienteById: async (id: string): Promise<Cliente> => {
    const response = await api.get<Cliente>(`/api/clientes/${id}`);
    return response.data;
  },

  criar: async (body: SalvarClienteRequest): Promise<Cliente> => {
    const response = await api.post<Cliente>('/api/clientes', body);
    return response.data;
  },

  atualizar: async (id: string, body: SalvarClienteRequest): Promise<Cliente> => {
    const response = await api.put<Cliente>(`/api/clientes/${id}`, body);
    return response.data;
  },

  criarDoCheckout: async (body: ClienteDoCheckoutRequest): Promise<Cliente> => {
    const response = await api.post<Cliente>('/api/clientes/checkout', body);
    return response.data;
  },

  anonimizar: async (id: string): Promise<Cliente> => {
    const response = await api.patch<Cliente>(`/api/clientes/${id}/anonimizar`);
    return response.data;
  },
};

export default clientesService;
