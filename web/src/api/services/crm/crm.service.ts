import api from '../../axiosInstance';
import type { Conversa, EnviarMensagemRequest } from './types';

export const crmService = {
  getConversas: async (): Promise<Conversa[]> => {
    const response = await api.get<Conversa[]>('/api/crm/conversas');
    return response.data;
  },

  getConversa: async (codigo: string): Promise<Conversa> => {
    const response = await api.get<Conversa>(`/api/crm/conversas/${codigo}`);
    return response.data;
  },

  enviarMensagem: async (codigo: string, body: EnviarMensagemRequest): Promise<Conversa> => {
    const response = await api.post<Conversa>(`/api/crm/conversas/${codigo}/mensagens`, body);
    return response.data;
  },

  marcarLida: async (codigo: string): Promise<void> => {
    await api.patch(`/api/crm/conversas/${codigo}/lida`);
  },

  resolver: async (codigo: string): Promise<void> => {
    await api.patch(`/api/crm/conversas/${codigo}/resolver`);
  },
};

export default crmService;
