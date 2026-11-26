import api from '../../axiosInstance';
import type { AtualizarPrecoRequest, CriarIngredienteRequest, Geometria, Ingrediente, RenderIngrediente, SalvarRenderRequest } from './types';

export const ingredientesService = {
  getIngredientes: async (): Promise<Ingrediente[]> => {
    const response = await api.get<Ingrediente[]>('/api/ingredientes');
    return response.data;
  },

  atualizarPreco: async (slug: string, body: AtualizarPrecoRequest): Promise<Ingrediente> => {
    const response = await api.patch<Ingrediente>(`/api/ingredientes/${slug}/preco`, body);
    return response.data;
  },

  salvarPeso: async (slug: string, gramas: number, precoKg: number): Promise<void> => {
    await api.patch(`/api/ingredientes/${slug}/peso`, { gramas, preco_kg: precoKg });
  },

  enviarImagem: async (slug: string, nome: string, base64: string): Promise<{ url: string }> => {
    const response = await api.post<{ url: string }>(`/api/ingredientes/${slug}/imagem`, { nome, base64 });
    return response.data;
  },

  getGeometrias: async (): Promise<Geometria[]> => {
    const response = await api.get<Geometria[]>('/api/ingredientes/geometrias');
    return response.data;
  },

  getRender: async (): Promise<RenderIngrediente[]> => {
    const response = await api.get<RenderIngrediente[]>('/api/ingredientes/render');
    return response.data;
  },

  criar: async (body: CriarIngredienteRequest): Promise<{ id: string; nome: string }> => {
    const { data } = await api.post<{ id: string; nome: string }>('/api/ingredientes', body);
    return data;
  },

  remover: async (slug: string): Promise<void> => {
    await api.delete(`/api/ingredientes/${slug}`);
  },

  salvarRender: async (slug: string, body: SalvarRenderRequest): Promise<void> => {
    await api.put(`/api/ingredientes/${slug}/render`, body);
  },

  enviarModelo: async (slug: string, nome: string, base64: string): Promise<{ url: string }> => {
    const response = await api.post<{ url: string }>(`/api/ingredientes/${slug}/modelo`, { nome, base64 });
    return response.data;
  },

  definirClasse: async (slug: string, classe: 'rodela' | 'desfiado' | 'espalhado' | 'fio'): Promise<void> => {
    await api.patch(`/api/ingredientes/${slug}/classe`, { classe });
  },

  enviarTextura: async (slug: string, nome: string, base64: string): Promise<{ url: string }> => {
    const response = await api.post<{ url: string }>(`/api/ingredientes/${slug}/textura`, { nome, base64 });
    return response.data;
  },
};

export default ingredientesService;
