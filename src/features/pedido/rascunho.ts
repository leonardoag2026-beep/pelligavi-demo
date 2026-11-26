import { SITE } from '../../shared/config/site.js';
import { descontoPara, taxaPara } from '../../api/services/config.service.js';
import type { ItemCarrinho } from '../../api/types.js';

interface EstadoRascunho {
  itens: ItemCarrinho[];
  modo: string;
}

const estado: EstadoRascunho = { itens: [], modo: 'entrega' };
const ouvintes = new Set<() => void>();

const avisar = (): void => {
  for (const fn of ouvintes) fn();
};

export const aoMudarRascunho = (fn: () => void): (() => boolean) => {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
};

export const itens = (): ItemCarrinho[] => estado.itens;

export const adicionar = (item: ItemCarrinho): void => {
  const chave = `${item.nome}|${item.detalhe}`;
  const existente = estado.itens.find((i) => `${i.nome}|${i.detalhe}` === chave);
  if (existente) existente.qtd += item.qtd;
  else estado.itens.push({ ...item });
  avisar();
};

export const mudarQtd = (indice: number, delta: number): void => {
  const item = estado.itens[indice];
  if (!item) return;
  item.qtd += delta;
  if (item.qtd <= 0) estado.itens.splice(indice, 1);
  avisar();
};

export const remover = (indice: number): void => {
  estado.itens.splice(indice, 1);
  avisar();
};

export const limpar = (): void => {
  estado.itens = [];
  avisar();
};

export const modo = (): string => estado.modo;

export const definirModo = (novo: string): void => {
  estado.modo = novo;
  avisar();
};

export const subtotal = (): number => estado.itens.reduce((s, i) => s + i.preco * i.qtd, 0);

export const taxa = (): number => {
  if (!estado.itens.length || estado.modo === 'retirada') return 0;
  const sub = subtotal();
  return sub >= SITE.entregaGratisAcima ? 0 : taxaPara('entrega');
};

export const desconto = (): number => descontoPara(subtotal());
export const total = (): number => Math.max(0, subtotal() + taxa() - desconto());
export const quantidade = (): number => estado.itens.reduce((s, i) => s + i.qtd, 0);

export const rascunho = {
  adicionar,
  mudarQtd,
  remover,
  limpar,
  subtotal,
  taxa,
  desconto,
  total,
  quantidade,
  modo,
  definirModo,
  aoMudar: aoMudarRascunho,
  itens,
};
