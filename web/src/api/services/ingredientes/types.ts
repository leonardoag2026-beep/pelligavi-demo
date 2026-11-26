export interface Ingrediente {
  id: string;
  nome: string;
  classe: string;
  preco: number;
  gramas: number;
  custo_kg: number;
  custo_porcao: number;
  margem: number;
  ativo: boolean;
  imagem: string | null;
  preco_kg: number | null;
}

export interface Geometria {
  tipo: string;
  rotulo: string;
  medidas: string[];
  valores: Record<string, number>;
}

export interface RenderIngrediente {
  id: string;
  geometria: 'auto' | 'fio' | 'fios' | 'rodela' | 'desfiado' | 'espalhado' | 'rasgada' | 'cubo' | 'stl';
  params: Record<string, number | string | boolean>;
  modeloUrl: string | null;
  texturaUrl: string | null;
}

export interface SalvarRenderRequest {
  geometria?: RenderIngrediente['geometria'];
  params?: Record<string, number | string | boolean>;
  modelo_url?: string | null;
  textura_url?: string | null;
}

export interface CriarIngredienteRequest {
  nome: string;
  classe: 'rodela' | 'desfiado' | 'espalhado' | 'fio';
  tipo: string;
  preco_porcao: number;
  custo_kg: number;
  gramas_porcao: number;
  cor?: string;
}

export interface AtualizarPrecoRequest {
  preco: number;
}
