import { ValidacaoError } from '../../../shared/errors/app-error.js';

// medidas obrigatórias por geometria. O servidor completa e grava: o front não guarda
// default nenhum, então todo ingrediente que chega na cena já tem a receita inteira
export const MEDIDAS_POR_TIPO: Record<string, Record<string, number>> = {
  disco: { raio: 0.09, altura: 0.016 },
  discoFoto: { raio: 0.1, altura: 0.012 },
  rodela: { raio: 0.09, altura: 0.016 },
  anel: { raio: 0.036, esp: 0.012 },
  anelFino: { raio: 0.06, esp: 0.006 },
  bola: { raio: 0.05 },
  pedaco: { raio: 0.042 },
  grao: { raio: 0.014 },
  cogumeloFatiado: { raio: 0.05 },
  camarao: { raio: 0.03 },
  cubo: { aresta: 0.058, alt: 0.046 },
  tira: { larg: 0.16, prof: 0.12, alt: 0.012 },
  fita: { larg: 0.09, prof: 0.03 },
  folha: { comp: 0.16, larg: 0.075 },
  rasgada: { comp: 0.2, larg: 0.14 },
  fios: {},
  // fio é um tubo: a grossura dele é o raio do tubo
  fio: { raio: 0.03 },
};

// catálogo de geometrias: o CRM lê daqui quais tipos existem e quais medidas cada um usa
export const GEOMETRIAS = (() => {
  const bruto = [
  { tipo: 'disco', rotulo: 'Disco', medidas: ['raio', 'altura'] },
  { tipo: 'discoFoto', rotulo: 'Disco com foto', medidas: ['raio', 'altura', 'imagem'] },
  { tipo: 'rodela', rotulo: 'Rodela', medidas: ['raio', 'altura'] },
  { tipo: 'anel', rotulo: 'Anel', medidas: ['raio', 'esp'] },
  { tipo: 'anelFino', rotulo: 'Anel fino', medidas: ['raio', 'esp'] },
  { tipo: 'bola', rotulo: 'Bola', medidas: ['raio'] },
  { tipo: 'pedaco', rotulo: 'Pedaço', medidas: ['raio'] },
  { tipo: 'grao', rotulo: 'Grão', medidas: ['raio'] },
  { tipo: 'cogumeloFatiado', rotulo: 'Cogumelo fatiado', medidas: ['raio'] },
  { tipo: 'camarao', rotulo: 'Camarão', medidas: ['raio'] },
  { tipo: 'cubo', rotulo: 'Cubo', medidas: ['aresta', 'alt'] },
  { tipo: 'tira', rotulo: 'Tira', medidas: ['larg', 'prof', 'alt'] },
  { tipo: 'fita', rotulo: 'Fita', medidas: ['larg', 'prof'] },
  { tipo: 'folha', rotulo: 'Folha', medidas: ['comp', 'larg'] },
  { tipo: 'rasgada', rotulo: 'Rasgada', medidas: ['comp', 'larg'] },
  { tipo: 'fios', rotulo: 'Fios (desfiado/ralado)', medidas: ['particulaTamanho', 'particulaCor'] },
  { tipo: 'fio', rotulo: 'Fio contínuo', medidas: ['raio'] },
  ] as Array<{ tipo: string; rotulo: string; medidas: string[] }>;
  return bruto.map((g) => ({ ...g, valores: MEDIDAS_POR_TIPO[g.tipo] ?? {} }));
})();

export interface ReceitaParams {
  tipo?: unknown;
  pecas?: unknown;
  porcao?: unknown;
  [chave: string]: unknown;
}

// completa a receita antes de gravar: medidas da geometria, peças por porção e, no
// desfiado, fios por peça. Nada disso pode depender de tabela no cliente
export const completarReceita = (params: ReceitaParams, tipoRecebido?: string): ReceitaParams => {
  const tipo = String(params.tipo ?? tipoRecebido ?? '').trim();
  if (!tipo) throw new ValidacaoError('Receita sem geometria (tipo)');
  const medidas = MEDIDAS_POR_TIPO[tipo];
  if (!medidas) throw new ValidacaoError(`Geometria desconhecida: ${tipo}`);

  const receita: ReceitaParams = { ...params, tipo };
  for (const [campo, padrao] of Object.entries(medidas)) {
    const valor = Number(receita[campo]);
    receita[campo] = Number.isFinite(valor) && valor > 0 ? valor : padrao;
  }

  const pecas = Number(receita.pecas);
  receita.pecas = Number.isFinite(pecas) && pecas >= 1 ? Math.min(240, Math.round(pecas)) : 1;

  if (tipo === 'fios') {
    const fios = Number(receita.porcao);
    receita.porcao = Number.isFinite(fios) && fios >= 1 ? Math.min(240, Math.round(fios)) : 1;
  }

  return receita;
};
