export type TipoIngrediente = 'rodela' | 'desfiado' | 'espalhado' | 'fio';

export interface TipoInfo {
  id: TipoIngrediente;
  nome: string;
  descricao: string;
}

export const TIPOS: TipoInfo[] = [
  {
    id: 'rodela',
    nome: 'Rodela',
    descricao: 'Disco ou cilindro baixo: cai em pé de fatia, uma por vez, e empilha em telha.',
  },
  {
    id: 'desfiado',
    nome: 'Desfiado / ralado',
    descricao: 'Fio solto que cobre a pizza inteira: sai do emissor e pousa sobre o que estiver embaixo.',
  },
  {
    id: 'espalhado',
    nome: 'Espalhado',
    descricao: 'Punhado de unidades soltas: caem separadas e se distribuem por igual na área.',
  },
  {
    id: 'fio',
    nome: 'Fio / creme',
    descricao: 'Um traço contínuo desenhado por cima da pizza, como o catupiry.',
  },
];


export interface ModeloIngrediente {
  modelo?: string;
  textura?: string;
}

export interface RenderIngrediente {
  escala?: number;
  variacao?: number;
  porcao?: number;
  altura?: number;
  rugosidade?: number;
  metalico?: number;
  repeticao?: number;
}

let CUSTOM: Record<string, TipoIngrediente> = {};
let MODELOS: Record<string, ModeloIngrediente> = {};
let RENDER: Record<string, RenderIngrediente> = {};

export const definirTipos = (mapa: Record<string, string>) => {
  const limpo: Record<string, TipoIngrediente> = {};
  for (const [chave, valor] of Object.entries(mapa)) {
    if (valor === 'rodela' || valor === 'desfiado' || valor === 'espalhado' || valor === 'fio') {
      limpo[String(chave).toLowerCase()] = valor as TipoIngrediente;
    }
  }
  CUSTOM = limpo;
};

export const definirModelos = (mapa: Record<string, ModeloIngrediente | string>) => {
  MODELOS = {};
  for (const [chave, valor] of Object.entries(mapa)) {
    if (!valor) continue;
    const modelo = typeof valor === 'string' ? { modelo: valor } : valor;
    if (modelo.modelo || modelo.textura) MODELOS[String(chave).toLowerCase()] = modelo;
  }
};

export const definirRenderParams = (mapa: Record<string, RenderIngrediente>) => {
  RENDER = {};
  for (const [chave, valor] of Object.entries(mapa)) {
    if (valor && typeof valor === 'object') RENDER[String(chave).toLowerCase()] = valor;
  }
};

const achar = <T,>(mapa: Record<string, T>, id: string, nome?: string): T | undefined => {
  const chave = String(id || '').toLowerCase();
  if (mapa[chave]) return mapa[chave];
  const porNome = normalizar(nome || '');
  if (porNome && mapa[porNome]) return mapa[porNome];
  return undefined;
};

export const renderDe = (id: string, nome?: string): RenderIngrediente => achar(RENDER, id, nome) ?? {};

// mescla só um ingrediente (usado pela prévia ao vivo do CRM, sem apagar o resto)
export const ajustarRender = (id: string, params: Record<string, any>) => {
  RENDER[String(id).toLowerCase()] = { ...(RENDER[String(id).toLowerCase()] || {}), ...params };
};

// chaves da "receita" procedural: o banco pode trazer a receita inteira e o motor
// só interpreta — o mapa RECEITAS do cliente vira fallback
export const RECEITA_CHAVES = [
  'tipo', 'cor', 'raio', 'altura', 'aresta', 'alt', 'larg', 'prof', 'esp', 'comp', 'imagem',
  'padrao', 'semente', 'jitter', 'angulo', 'curvatura', 'camadas',
] as const;

export const receitaDe = (id: string, nome?: string): Record<string, any> => {
  const params = renderDe(id, nome) as Record<string, any>;
  const receita: Record<string, any> = {};
  for (const chave of RECEITA_CHAVES) {
    if (params[chave] !== undefined && params[chave] !== null && params[chave] !== '') receita[chave] = params[chave];
  }
  return receita;
};

// partícula (desfiado/ralado): tamanho, cor e raio também vêm do banco
export const particulaDe = (id: string, nome?: string): Record<string, any> => {
  const params = renderDe(id, nome) as Record<string, any>;
  const saida: Record<string, any> = {};
  if (params.particulaTamanho !== undefined) saida.tamanho = Number(params.particulaTamanho);
  if (params.particulaCor !== undefined) saida.cor = String(params.particulaCor);
  if (params.particulaRaio !== undefined) saida.raio = Number(params.particulaRaio);
  // desfiado/ralado não é posicionado peça a peça: sai do emissor em fios (o motor
  // lê esta flag para montar o sprite e deixar o despejo animado)
  if (tipoDe(id, nome) === 'desfiado') saida.folha = true;
  return saida;
};

// padrão de textura vem do servidor (params.padrao); sem ele a peça usa só a cor
export const padraoDe = (id: string, nome?: string): string => {
  const params = renderDe(id, nome) as Record<string, any>;
  return params.padrao ? String(params.padrao) : '';
};

// debug: o que o motor enxerga de modelo/receita por ingrediente
export const depurarModelos = () => ({ modelos: MODELOS, render: RENDER });

export const texturaDe = (id: string, nome?: string): string | null =>
  achar(MODELOS, id, nome)?.textura ?? null;

const normalizar = (texto: string) => String(texto || '').toLowerCase().replace(/[^a-z ]/g, '').trim();

export const modeloDe = (id: string, nome?: string): ModeloIngrediente | null => {
  const chave = String(id || '').toLowerCase();
  if (MODELOS[chave]) return MODELOS[chave]!;
  const porNome = normalizar(nome || '');
  if (porNome && MODELOS[porNome]) return MODELOS[porNome]!;
  return null;
};



// deposição vem de ingrediente.classe (NOT NULL com CHECK no banco): nada de mapa local
export const tipoDe = (id: string, nome?: string): TipoIngrediente | undefined => {
  const chave = String(id || '').toLowerCase();
  if (CUSTOM[chave]) return CUSTOM[chave]!;
  const customNome = normalizar(nome || '');
  if (customNome && CUSTOM[customNome]) return CUSTOM[customNome]!;
  return undefined;
};

export const tipoInfo = (id: string): TipoInfo =>
  TIPOS.find((t) => t.id === id) || TIPOS[2]!;

export const ehRodela = (id: string): boolean => tipoDe(id) === 'rodela';
export const ehDesfiado = (id: string): boolean => tipoDe(id) === 'desfiado';
export const ehEspalhado = (id: string): boolean => tipoDe(id) === 'espalhado';
