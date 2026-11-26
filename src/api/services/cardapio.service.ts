import { BEBIDAS, EXTRAS, TAMANHOS, hidratarMenu } from './menu.service.js';
export { classesDoCatalogo, modelosDoCatalogo } from './menu.service.js';
import type { TamanhoMenu } from './menu.service.js';

export interface SaborCardapio {
  id: string;
  nome: string;
  precos: Record<string, number>;
  itens: string[];
  ativo?: boolean;
}

export interface BebidaCardapio {
  id: string;
  nome: string;
  detalhe: string;
  preco: number;
  arte: string;
  ativo?: boolean;
}

export interface AdicionalCardapio {
  id: string;
  nome: string;
  preco: number;
  ativo?: boolean;
  borda?: boolean;
}

export interface Cardapio {
  sabores: SaborCardapio[];
  bebidas: BebidaCardapio[];
  adicionais: AdicionalCardapio[];
}

export type GrupoCardapio = 'sabores' | 'bebidas' | 'adicionais';
export type ItemDeGrupo = SaborCardapio | BebidaCardapio | AdicionalCardapio;

interface CardapioApi {
  tamanhos: TamanhoMenu[];
  sabores: SaborCardapio[];
  bebidas: BebidaCardapio[];
  bordas: { id: string; nome: string; preco: number }[];
  montagem: { preco: number };
}

interface IngredienteApi {
  id: string;
  nome: string;
  classe: string;
  preco: number;
  gramas: number;
  custo_porcao: number;
  margem: number;
}

export const SABORES: SaborCardapio[] = [];
export const BEBIDAS_CARDAPIO: BebidaCardapio[] = [];
export const ADICIONAIS: AdicionalCardapio[] = [];

const pegar = async <T>(caminho: string): Promise<T> => {
  const resposta = await fetch(`/api${caminho}`, { credentials: 'same-origin' });
  if (!resposta.ok) throw new Error(`API ${caminho}: ${resposta.status}`);
  return (await resposta.json()) as T;
};

const enviar = async (caminho: string, corpo: unknown): Promise<void> => {
  const resposta = await fetch(`/api${caminho}`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) throw new Error(`API ${caminho}: ${resposta.status}`);
};

export const carregarCardapio = async (): Promise<void> => {
  const [cardapio, ingredientes] = await Promise.all([
    pegar<CardapioApi>('/cardapio'),
    pegar<IngredienteApi[]>('/ingredientes'),
  ]);

  hidratarMenu(cardapio, ingredientes);

  SABORES.splice(0, SABORES.length, ...cardapio.sabores.map((s) => ({ ...s, ativo: s.ativo !== false })));
  BEBIDAS_CARDAPIO.splice(0, BEBIDAS_CARDAPIO.length, ...cardapio.bebidas.map((b) => ({ ...b, ativo: true })));
  ADICIONAIS.splice(0, ADICIONAIS.length, ...cardapio.bordas.map((b) => ({
    id: b.id,
    nome: b.nome,
    preco: b.preco,
    ativo: true,
    borda: true,
  })));
};

export const cardapio = (): Cardapio => ({
  sabores: SABORES,
  bebidas: BEBIDAS_CARDAPIO,
  adicionais: ADICIONAIS,
});

const grupo = (tipo: GrupoCardapio): ItemDeGrupo[] =>
  tipo === 'sabores' ? SABORES : tipo === 'bebidas' ? BEBIDAS_CARDAPIO : ADICIONAIS;

export const salvarItem = (tipo: GrupoCardapio, item: ItemDeGrupo): ItemDeGrupo[] => {
  const lista = grupo(tipo);
  const anterior = lista.find((i) => i.id === item.id);
  const novo = { ...anterior, ...item } as ItemDeGrupo;
  const indice = lista.findIndex((i) => i.id === item.id);
  if (indice >= 0) lista[indice] = novo;
  else lista.push(novo);

  if (tipo === 'sabores') {
    const sabor = novo as SaborCardapio;
    for (const [tamanho, valor] of Object.entries(sabor.precos || {})) {
      void enviar(`/cardapio/produtos/${sabor.id}/preco`, { tamanho, valor }).catch(() => undefined);
    }
  } else {
    const produto = novo as BebidaCardapio | AdicionalCardapio;
    const tamanho = tipo === 'bebidas' ? 'u' : 'u';
    if (typeof produto.preco === 'number') {
      void enviar(`/cardapio/produtos/${produto.id}/preco`, { tamanho, valor: produto.preco }).catch(() => undefined);
    }
  }
  return lista;
};

export const alternarAtivo = (tipo: GrupoCardapio, id: string): ItemDeGrupo[] => {
  const lista = grupo(tipo);
  const item = lista.find((i) => i.id === id);
  if (item) {
    item.ativo = item.ativo === false;
    void enviar(`/cardapio/produtos/${id}/ativo`, { ativo: item.ativo !== false }).catch(() => undefined);
  }
  return lista;
};

export const disponivel = (tipo: GrupoCardapio, id: string): boolean => {
  const item = grupo(tipo).find((i) => i.id === id);
  return item ? item.ativo !== false : true;
};

export const sabor = (id: string): SaborCardapio | undefined => SABORES.find((s) => s.id === id);

export const precoSabor = (id: string, tamanhoId: string): number | null => {
  const s = SABORES.find((x) => x.id === id);
  if (!s) return null;
  return s.precos[tamanhoId] ?? s.precos.m ?? 0;
};

export const saboresAtivos = (): SaborCardapio[] => SABORES.filter((s) => s.ativo !== false);
export const bebidasAtivas = (): BebidaCardapio[] => BEBIDAS_CARDAPIO.filter((b) => b.ativo !== false);
export const adicionaisAtivos = (): AdicionalCardapio[] => ADICIONAIS.filter((a) => a.ativo !== false);
export const tamanhos = (): TamanhoMenu[] => TAMANHOS;
export const extras = () => EXTRAS;
export const bebidas = () => BEBIDAS;
