import api from '../../axiosInstance';
import type { EnderecoCep, SugestaoRua } from './types';

export const geoService = {
  porCep: async (cep: string): Promise<EnderecoCep> => {
    const { data } = await api.get<EnderecoCep>(`/api/geo/cep/${cep.replace(/\D/g, '')}`);
    return data;
  },

  // distância calculada NO SERVIDOR: o front só mostra e bloqueia
  distancia: async (endereco: string): Promise<{ distanciaKm: number; raioKm: number; dentro: boolean }> => {
    const { data } = await api.get<{ distanciaKm: number; raioKm: number; dentro: boolean }>('/api/geo/distancia', {
      params: { endereco },
    });
    return data;
  },

  ruas: async (termo: string): Promise<SugestaoRua[]> => {
    if (termo.trim().length < 3) return [];
    const { data } = await api.get<{ sugestoes: SugestaoRua[] }>('/api/geo/ruas', { params: { q: termo } });
    return data.sugestoes ?? [];
  },

  // sugestões enquanto digita: CEP, rua, avenida, bairro ou referência
  sugestoes: async (termo: string): Promise<SugestaoRua[]> => {
    if (termo.trim().length < 3) return [];
    const { data } = await api.get<{ sugestoes: SugestaoRua[] }>('/api/geo/sugestoes', { params: { q: termo } });
    return data.sugestoes ?? [];
  },
};
