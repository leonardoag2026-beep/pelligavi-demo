export interface Tamanho {
  id: string;
  nome: string;
  medida: string;
  fatias: number;
  fator: number;
}

export interface ItemReceita {
  id: string;
  porcoes: number;
  gramas: number;
}

export interface Sabor {
  id: string;
  nome: string;
  precos: Record<string, number>;
  itens: string[];
  receita?: ItemReceita[];
  imagem?: string | null;
  ativo: boolean;
}

export interface SaborDetalhe {
  id: string;
  nome: string;
  ativo: boolean;
  precos: Record<string, number>;
  receita: (ItemReceita & { nome: string })[];
  imagem: string | null;
}

export interface Borda {
  id: string;
  nome: string;
  detalhe: string | null;
  preco: number;
}

export interface Bebida {
  id: string;
  nome: string;
  detalhe: string | null;
  preco: number;
  arte: string;
  imagem: string | null;
  categoria?: string;
}

export interface Cardapio {
  tamanhos: Tamanho[];
  montagem: { preco: number };
  sabores: Sabor[];
  bordas: Borda[];
  bebidas: Bebida[];
}
