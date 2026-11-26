import api from '../../axiosInstance';
import type { NotificacoesResponse } from './types';

export const notificacoesService = {
  getNotificacoes: async (limite = 40): Promise<NotificacoesResponse> => {
    const response = await api.get<NotificacoesResponse>('/api/notificacoes', { params: { limite } });
    return response.data;
  },

  marcarLida: async (id: number): Promise<void> => {
    await api.patch(`/api/notificacoes/${id}/lida`);
  },

  marcarTodas: async (): Promise<void> => {
    await api.patch('/api/notificacoes/todas/lida');
  },
};

export default notificacoesService;
