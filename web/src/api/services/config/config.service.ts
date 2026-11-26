import api from '../../axiosInstance';
import type { AtualizarConfigRequest, LojaConfig } from './types';

export const configService = {
  getConfig: async (): Promise<LojaConfig> => {
    const response = await api.get<LojaConfig>('/api/config');
    return response.data;
  },

  atualizar: async (body: AtualizarConfigRequest): Promise<LojaConfig> => {
    const response = await api.put<LojaConfig>('/api/config', body);
    return response.data;
  },
};

export default configService;
