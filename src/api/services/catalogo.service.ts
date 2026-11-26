import { BEBIDAS, TAMANHOS, EXTRAS, slugDoNome } from './menu.service.js';
import { tipoDe, type TipoIngrediente } from '../../shared/config/ingredientes.js';
import { miniatura } from '../../shared/ui/miniaturas.js';
import { bebidaArt } from '../../shared/ui/art.js';

const CHAVE = 'pelligavi.catalogo';
const VERSAO = 4;

export type SecaoCatalogo = 'ingredientes' | 'tamanhos' | 'bebidas';

export interface ItemCatalogo {
  nome: string;
  preco: number;
  imagem: string;
  tipo: string;
  fatias?: number;
  classe?: TipoIngrediente;
  precoGrama?: number;
  porcoes?: { p: number; m: number; g: number };
  gramas?: number;
  modelo?: string;
}

export interface Catalogo {
  versao?: number;
  ingredientes: ItemCatalogo[];
  tamanhos: ItemCatalogo[];
  bebidas: ItemCatalogo[];
}

const ALIAS: Record<string, string> = {
  'mussarela de bufala': 'mussarela',
  'mussarela de búfala': 'mussarela',
  'basilico': 'basilico',
  'basílico': 'basilico',
  'manjericao': 'basilico',
  'manjericão': 'basilico',
};

const idDoNome = (nome: string): string => {
  const chave = String(nome || '').toLowerCase();
  if (ALIAS[chave]) return ALIAS[chave]!;
  const semAcento = chave.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (ALIAS[semAcento]) return ALIAS[semAcento]!;
  return semAcento.replace(/[^a-z0-9]+/g, '-');
};

const padrao = (): Catalogo => ({
  versao: VERSAO,
  // a lista vem de /api/ingredientes (tabela ingrediente), não de constante do front
  ingredientes: EXTRAS.map((extra) => ({
    nome: extra.nome,
    preco: extra.preco,
    imagem: miniatura(extra.id),
    tipo: 'ingrediente',
    classe: tipoDe(extra.id, extra.nome),
    precoGrama: extra.gramas ? Math.round((extra.preco / extra.gramas) * 10) / 1000 : 0,
    porcoes: { p: 1, m: 1, g: 1 },
    gramas: extra.gramas,
  })),
  tamanhos: TAMANHOS.map((t) => ({
    nome: t.nome, preco: 0, fatias: t.fatias, imagem: '', tipo: 'tamanho',
  })),
  bebidas: BEBIDAS.map((b) => ({
    nome: b.nome, preco: b.preco, imagem: b.arte ? bebidaArt(b.arte) : '', tipo: 'bebida',
  })),
});

export const catalogo = (): Catalogo => {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null') as Catalogo | null;
    if (salvo && salvo.ingredientes) {
      if (salvo.versao !== VERSAO) {
        for (const item of salvo.ingredientes) {
          const id = idDoNome(item.nome);
          item.classe = tipoDe(id, item.nome);
          const extra = EXTRAS.find((e) => e.id === id || slugDoNome(e.nome) === slugDoNome(item.nome));
          if (extra) {
            item.preco = extra.preco;
            item.gramas = extra.gramas;
            item.precoGrama = extra.gramas ? Math.round((extra.preco / extra.gramas) * 10) / 1000 : 0;
          }
        }
        salvo.versao = VERSAO;
        localStorage.setItem(CHAVE, JSON.stringify(salvo));
      }
      return salvo;
    }
  } catch { /* usa o padrão */ }
  const inicial = padrao();
  localStorage.setItem(CHAVE, JSON.stringify(inicial));
  return inicial;
};

const gravar = (dados: Catalogo): Catalogo => {
  dados.versao = VERSAO;
  localStorage.setItem(CHAVE, JSON.stringify(dados));
  return dados;
};

export const adicionar = (secao: SecaoCatalogo, item: ItemCatalogo): Catalogo => {
  const dados = catalogo();
  dados[secao].push(item);
  return gravar(dados);
};

export const remover = (secao: SecaoCatalogo, indice: number): Catalogo => {
  const dados = catalogo();
  dados[secao].splice(indice, 1);
  return gravar(dados);
};

export const definirImagem = (secao: SecaoCatalogo, indice: number, dataUrl: string): Catalogo => {
  const dados = catalogo();
  const alvo = dados[secao][indice];
  if (alvo) alvo.imagem = dataUrl;
  return gravar(dados);
};

export const renomear = (secao: SecaoCatalogo, indice: number, nome: string): Catalogo => {
  const dados = catalogo();
  const alvo = dados[secao][indice];
  if (alvo) alvo.nome = nome;
  return gravar(dados);
};

export const resetar = (): Catalogo => gravar(padrao());

export const classesDoCatalogo = (): Record<string, string> => {
  const mapa: Record<string, string> = {};
  for (const item of catalogo().ingredientes) {
    const classe = item.classe || tipoDe(item.nome, item.nome);
    mapa[item.nome] = classe;
    mapa[item.nome.toLowerCase().replace(/[^a-z ]/g, '').trim()] = classe;
    mapa[slugDoNome(item.nome)] = classe;
  }
  return mapa;
};

export const modelosDoCatalogo = (): Record<string, { modelo: string; textura?: string }> => {
  const mapa: Record<string, { modelo: string; textura?: string }> = {};
  for (const item of catalogo().ingredientes) {
    if (!item.modelo) continue;
    const textura = String(item.imagem || '').startsWith('data:image') ? item.imagem : undefined;
    mapa[item.nome.toLowerCase().replace(/[^a-z ]/g, '').trim()] = { modelo: item.modelo, textura };
    mapa[slugDoNome(item.nome)] = { modelo: item.modelo, textura };
  }
  return mapa;
};

export const definirClasse = (indice: number, classe: TipoIngrediente): Catalogo => {
  const dados = catalogo();
  const alvo = dados.ingredientes[indice];
  if (alvo) alvo.classe = classe;
  return gravar(dados);
};
