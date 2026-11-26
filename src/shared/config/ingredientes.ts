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

export const TIPO_PADRAO: Record<string, TipoIngrediente> = {
  calabresa: 'rodela',
  pepperoni: 'rodela',
  tomate: 'rodela',
  'tomate-seco': 'espalhado',
  palmito: 'rodela',
  lombo: 'rodela',
  berinjela: 'rodela',
  abobrinha: 'rodela',
  champignon: 'espalhado',
  pimentao: 'rodela',
  frango: 'desfiado',
  mussarela: 'desfiado',
  provolone: 'desfiado',
  gorgonzola: 'desfiado',
  parmesao: 'desfiado',
  presunto: 'desfiado',
  'carne-seca': 'desfiado',
  atum: 'desfiado',
  rucula: 'espalhado',
  basilico: 'desfiado',
  oregano: 'desfiado',
  azeitona: 'espalhado',
  'azeitona-verde': 'espalhado',
  cebola: 'espalhado',
  'cebola-caramelo': 'espalhado',
  bacon: 'espalhado',
  camarao: 'espalhado',
  milho: 'espalhado',
  alho: 'espalhado',
  catupiry: 'fio',
};

export interface ModeloIngrediente {
  modelo: string;
  textura?: string;
}

let CUSTOM: Record<string, TipoIngrediente> = {};
let MODELOS: Record<string, ModeloIngrediente> = {};

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
    if (modelo.modelo) MODELOS[String(chave).toLowerCase()] = modelo;
  }
};

const normalizar = (texto: string) => String(texto || '').toLowerCase().replace(/[^a-z ]/g, '').trim();

export const modeloDe = (id: string, nome?: string): ModeloIngrediente | null => {
  const chave = String(id || '').toLowerCase();
  if (MODELOS[chave]) return MODELOS[chave]!;
  const porNome = normalizar(nome || '');
  if (porNome && MODELOS[porNome]) return MODELOS[porNome]!;
  return null;
};

const POR_NOME: Record<string, TipoIngrediente> = (() => {
  const mapa: Record<string, TipoIngrediente> = {};
  for (const [id, tipo] of Object.entries(TIPO_PADRAO)) {
    mapa[id] = tipo;
    mapa[id.replace(/-/g, ' ')] = tipo;
  }
  return mapa;
})();

export const tipoDe = (id: string, nome?: string): TipoIngrediente => {
  const chave = String(id || '').toLowerCase();
  if (CUSTOM[chave]) return CUSTOM[chave]!;
  const customNome = normalizar(nome || '');
  if (customNome && CUSTOM[customNome]) return CUSTOM[customNome]!;
  if (POR_NOME[chave]) return POR_NOME[chave];
  const porNome = String(nome || '').toLowerCase().replace(/[^a-z ]/g, '').trim();
  for (const [k, tipo] of Object.entries(POR_NOME)) {
    if (porNome && (porNome === k || porNome.includes(k))) return tipo;
  }
  return 'espalhado';
};

export const tipoInfo = (id: string): TipoInfo =>
  TIPOS.find((t) => t.id === id) || TIPOS[2]!;

export const ehRodela = (id: string): boolean => tipoDe(id) === 'rodela';
export const ehDesfiado = (id: string): boolean => tipoDe(id) === 'desfiado';
export const ehEspalhado = (id: string): boolean => tipoDe(id) === 'espalhado';
