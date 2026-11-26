import api from '../../axiosInstance';
import type { Cardapio, SaborDetalhe } from './types';

export interface PrecoRequest {
  tamanho: string;
  valor: number;
}

export interface SalvarSaborRequest {
  nome: string;
  ativo?: boolean;
  precos: Record<string, number>;
  receita: { id: string; gramas: number; porcoes: number }[];
}

export interface TamanhoRequest {
  nome: string;
  diametro_cm: number;
  fatias: number;
}

export interface CriarTamanhoRequest extends TamanhoRequest {
  fator: number;
}

export interface BebidaRequest {
  nome: string;
  detalhe: string;
  preco: number;
}

export const cardapioService = {
  getCardapio: async (): Promise<Cardapio> => {
    const response = await api.get<Cardapio>('/api/cardapio');
    return response.data;
  },

  enviarImagemBebida: async (slug: string, nome: string, base64: string): Promise<{ url: string }> => {
    const response = await api.post<{ url: string }>(`/api/cardapio/bebidas/${slug}/imagem`, { nome, base64 });
    return response.data;
  },

  sabor: async (slug: string): Promise<SaborDetalhe> => {
    const { data } = await api.get<SaborDetalhe>(`/api/cardapio/sabores/${slug}`);
    return data;
  },

  salvarSabor: async (slug: string, body: SalvarSaborRequest): Promise<SaborDetalhe> => {
    const { data } = await api.put<SaborDetalhe>(`/api/cardapio/sabores/${slug}`, body);
    return data;
  },

  removerSabor: async (slug: string): Promise<void> => {
    await api.delete(`/api/cardapio/sabores/${slug}`);
  },

  criarSabor: async (body: SalvarSaborRequest): Promise<{ id: number; slug: string }> => {
    const { data } = await api.post<{ id: number; slug: string }>('/api/cardapio/sabores', body);
    return data;
  },

  salvarPreco: async (slug: string, body: PrecoRequest): Promise<void> => {
    await api.patch(`/api/cardapio/produtos/${slug}/preco`, body);
  },

  salvarTamanho: async (slug: string, body: TamanhoRequest): Promise<void> => {
    await api.patch(`/api/cardapio/tamanhos/${slug}`, body);
  },

  criarTamanho: async (body: CriarTamanhoRequest): Promise<{ id: string; nome: string }> => {
    const { data } = await api.post<{ id: string; nome: string }>('/api/cardapio/tamanhos', body);
    return data;
  },

  removerTamanho: async (slug: string): Promise<void> => {
    await api.delete(`/api/cardapio/tamanhos/${slug}`);
  },

  criarBebida: async (body: BebidaRequest): Promise<{ id: string; nome: string }> => {
    const { data } = await api.post<{ id: string; nome: string }>('/api/cardapio/bebidas', body);
    return data;
  },

  salvarBebida: async (slug: string, body: BebidaRequest): Promise<{ id: string; nome: string }> => {
    const { data } = await api.put<{ id: string; nome: string }>(`/api/cardapio/bebidas/${slug}`, body);
    return data;
  },

  removerBebida: async (slug: string): Promise<void> => {
    await api.delete(`/api/cardapio/bebidas/${slug}`);
  },
};

export default cardapioService;
