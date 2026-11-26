export interface TamanhoMenu {
  id: string;
  nome: string;
  medida: string;
  fatias: number;
  fator: number;
}

export interface BordaMenu {
  id: string;
  nome: string;
  preco: number;
  recheio: string | null;
}

export interface ExtraMenu {
  id: string;
  nome: string;
  preco: number;
  gramas: number;
  custo?: number;
  margem?: number;
  fio?: boolean;
}

export interface BebidaMenu {
  id: string;
  nome: string;
  detalhe: string;
  preco: number;
  arte: string;
  ativo?: boolean;
  imagem?: string;
}

export interface PizzaParaPreco {
  base: number;
  tamanhoId: string;
  bordaId: string;
  extras?: string[];
}

export interface PizzaParaDescrever {
  nome: string;
  tamanhoId: string;
  bordaId?: string;
  extras?: string[];
}

export const TAMANHOS: TamanhoMenu[] = [];
export const BORDAS: BordaMenu[] = [];
export const EXTRAS: ExtraMenu[] = [];
export const BEBIDAS: BebidaMenu[] = [];

export const MONTAGEM = { id: 'montagem', nome: 'Monte a sua', preco: 0, toppings: ['mussarela'] };

// cor do recheio é apresentação (3D), não dado de negócio: continua no front
const CORES_BORDA: Record<string, string | null> = {
  tradicional: null,
  catupiry: '#f7eed6',
  cheddar: '#e2a139',
  mussarela: '#f6e3b4',
};

export interface CardapioApi {
  tamanhos: { id: string; nome: string; medida: string; fatias: number; fator: number }[];
  sabores: { id: string; nome: string; precos: Record<string, number>; itens: string[]; ativo?: boolean }[];
  bebidas: BebidaMenu[];
  bordas: { id: string; nome: string; preco: number }[];
  montagem: { preco: number };
}

export interface IngredienteApi {
  id: string;
  nome: string;
  classe: string;
  preco: number;
  gramas: number;
  custo_porcao: number;
  margem: number;
}

const CLASSES: Record<string, string> = {};

export const classesDoCatalogo = (): Record<string, string> => CLASSES;
export const modelosDoCatalogo = (): Record<string, string> => ({});

export const hidratarMenu = (cardapio: CardapioApi, ingredientes: IngredienteApi[]): void => {
  for (const chave of Object.keys(CLASSES)) delete CLASSES[chave];
  for (const i of ingredientes) CLASSES[i.id] = i.classe;
  TAMANHOS.splice(0, TAMANHOS.length, ...cardapio.tamanhos);
  BORDAS.splice(0, BORDAS.length, ...cardapio.bordas.map((b) => ({
    id: b.id,
    nome: b.nome,
    preco: b.preco,
    recheio: CORES_BORDA[b.id] ?? null,
  })));
  BEBIDAS.splice(0, BEBIDAS.length, ...cardapio.bebidas.map((b) => ({ ...b, ativo: true })));
  EXTRAS.splice(0, EXTRAS.length, ...ingredientes.map((i) => ({
    id: i.id,
    nome: i.nome,
    preco: i.preco,
    gramas: i.gramas,
    custo: i.custo_porcao,
    margem: i.margem,
    fio: i.classe === 'fio',
  })));
  MONTAGEM.preco = cardapio.montagem?.preco ?? 0;
};

// peças visíveis por porção — cada uma corresponde ao peso real do ingrediente
// (ex.: 70 g de pepperoni ≈ 10 fatias de 4 cm; 50 g de cebola ≈ 14 anéis)
export const PECAS: Record<string, number> = {
  // rodela: uma peça por pedaço — a pizza tem 8 pedaços
  calabresa: 8,
  pepperoni: 8,
  mussarela: 7,
  provolone: 7,
  gorgonzola: 8,
  bacon: 30,
  presunto: 8,
  lombo: 8,
  camarao: 11,
  azeitona: 8,
  'azeitona-verde': 8,
  cebola: 14,
  'cebola-caramelo': 12,
  tomate: 8,
  'tomate-seco': 30,
  rucula: 8,
  basilico: 8,
  palmito: 8,
  champignon: 18,
  pimentao: 8,
  berinjela: 8,
  abobrinha: 8,
  frango: 10,
  'carne-seca': 8,
  atum: 8,
  parmesao: 8,
  catupiry: 1,
  milho: 50,
  alho: 20,
  oregano: 10,
};

export const pecasDe = (id: string): number => PECAS[id] || 6;

export const tamanho = (id: string): TamanhoMenu => TAMANHOS.find((t) => t.id === id) || TAMANHOS[0]!;
export const borda = (id: string): BordaMenu => BORDAS.find((b) => b.id === id) || BORDAS[0]!;
export const slugDoNome = (nome: string): string =>
  String(nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// o ingrediente agora vive no banco (tabela ingrediente) e chega por carregarMenu();
// não existe mais catálogo paralelo em localStorage
export const extrasDoCatalogo = (): ExtraMenu[] => [];

export const extra = (id: string): ExtraMenu | undefined =>
  EXTRAS.find((e) => e.id === id) || extrasDoCatalogo().find((e) => e.id === id);

export const precoPizza = ({ base, tamanhoId, bordaId, extras }: PizzaParaPreco): number => {
  const fator = tamanho(tamanhoId).fator;
  const adicionais = (extras || []).reduce((soma, id) => soma + (extra(id)?.preco || 0), 0);
  return Math.round(base * fator) + borda(bordaId).preco + adicionais;
};

export const descrever = ({ nome, tamanhoId, bordaId, extras }: PizzaParaDescrever): string => {
  const partes = [tamanho(tamanhoId).nome.toLowerCase()];
  if (bordaId && bordaId !== 'tradicional') partes.push(borda(bordaId).nome.toLowerCase());
  const nomes = (extras || []).map((id) => extra(id)?.nome.toLowerCase()).filter(Boolean);
  if (nomes.length) partes.push(nomes.join(', '));
  return `${nome} · ${partes.join(' · ')}`;
};

export const menuService = {
  tamanhos: () => TAMANHOS,
  bordas: () => BORDAS,
  extras: () => EXTRAS,
  bebidas: () => BEBIDAS,
  precoPizza,
  descrever,
};
