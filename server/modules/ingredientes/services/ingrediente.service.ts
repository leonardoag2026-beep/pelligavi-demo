import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NaoEncontradoError, ValidacaoError } from '../../../shared/errors/app-error.js';
import ingredienteRepository, { type IngredienteLinha, type RenderDados } from '../repositories/ingrediente.repository.js';
import { completarReceita, type ReceitaParams } from './receita.service.js';

const PASTA_MODELOS = join(process.cwd(), 'server/uploads/modelos');
const PASTA_IMAGENS = join(process.cwd(), 'server/uploads/imagens');
const PASTA_TEXTURAS = join(process.cwd(), 'server/uploads/texturas');

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

const custoDaPorcao = (linha: IngredienteLinha): number =>
  Math.round((linha.custo_kg * linha.gramas_porcao) / 1000);

const montar = (linha: IngredienteLinha): Ingrediente => {
  const custoPorcao = custoDaPorcao(linha);
  return {
    id: linha.slug,
    nome: linha.nome,
    classe: linha.classe,
    preco: linha.preco_porcao,
    gramas: linha.gramas_porcao,
    custo_kg: linha.custo_kg,
    custo_porcao: custoPorcao,
    margem: linha.preco_porcao > 0 ? Number((1 - custoPorcao / linha.preco_porcao).toFixed(4)) : 0,
    ativo: linha.ativo,
    imagem: linha.imagem,
    preco_kg: linha.preco_kg,
  };
};

export interface RenderIngrediente {
  id: string;
  geometria: string;
  params: Record<string, unknown>;
  modeloUrl: string | null;
  texturaUrl: string | null;
}

export const ingredienteService = {
  listarRender: async (): Promise<RenderIngrediente[]> => {
    const linhas = await ingredienteRepository.listarRender();
    return linhas.map((l) => ({
      id: l.slug,
      geometria: l.geometria,
      params: l.params ?? {},
      modeloUrl: l.modelo_url,
      texturaUrl: l.textura_url,
    }));
  },

  salvarRender: async (slug: string, dados: RenderDados): Promise<void> => {
    // receita incompleta não entra no banco: o servidor completa medidas e porções
    const completos =
      dados.params && typeof dados.params === 'object'
        ? { ...dados, params: completarReceita(dados.params as ReceitaParams) }
        : dados;
    const alteradas = await ingredienteRepository.salvarRender(slug, completos);
    if (!alteradas) throw new NaoEncontradoError(`Ingrediente ${slug} não encontrado`);
  },

  atualizarPeso: async (slug: string, gramas: number, precoKg: number): Promise<void> => {
    const alteradas = await ingredienteRepository.atualizarPeso(slug, gramas, precoKg);
    if (!alteradas) throw new NaoEncontradoError(`Ingrediente ${slug} não encontrado`);
  },

  salvarImagem: async (slug: string, nome: string, base64: string): Promise<{ url: string }> => {
    const limpo = base64.includes(',') ? base64.slice(base64.indexOf(',') + 1) : base64;
    const binario = Buffer.from(limpo, 'base64');
    if (binario.byteLength < 32) throw new ValidacaoError('Imagem inválida');

    const extensao = /[.](png|jpg|jpeg|webp|svg)$/i.exec(nome)?.[0]?.toLowerCase() ?? '.png';
    const arquivo = `${slug}-${Date.now()}${extensao}`;
    await mkdir(PASTA_IMAGENS, { recursive: true });
    await writeFile(join(PASTA_IMAGENS, arquivo), binario);

    const url = `/imagens/${arquivo}`;
    const alteradas = await ingredienteRepository.definirImagem(slug, url);
    if (!alteradas) throw new NaoEncontradoError(`Ingrediente ${slug} não encontrado`);
    return { url };
  },

  salvarModelo: async (slug: string, nome: string, base64: string): Promise<{ url: string }> => {
    const limpo = base64.includes(',') ? base64.slice(base64.indexOf(',') + 1) : base64;
    const binario = Buffer.from(limpo, 'base64');
    if (binario.byteLength < 84) throw new ValidacaoError('Arquivo 3D inválido');

    const aceitas = ['.stl', '.glb', '.gltf', '.obj', '.ply'] as const;
    const extensao = (aceitas.find((e) => nome.toLowerCase().endsWith(e)) ?? '.stl') as string;
    const arquivo = `${slug}-${Date.now()}${extensao}`;
    await mkdir(PASTA_MODELOS, { recursive: true });
    await writeFile(join(PASTA_MODELOS, arquivo), binario);

    const url = `/modelos/${arquivo}`;
    // mantém a receita da peça e liga o uso do arquivo: upload sem isso ficava salvo e invisível
    const atual = await ingredienteRepository.renderDe(slug);
    const params = { ...((atual?.params ?? {}) as Record<string, unknown>), modelo: true };
    await ingredienteService.salvarRender(slug, { modelo_url: url, params } as never);
    return { url };
  },

  salvarTextura: async (slug: string, nome: string, base64: string): Promise<{ url: string }> => {
    const limpo = base64.includes(',') ? base64.slice(base64.indexOf(',') + 1) : base64;
    const binario = Buffer.from(limpo, 'base64');
    if (binario.byteLength < 256) throw new ValidacaoError('Textura inválida');

    const extensao = /\.(png|jpg|jpeg|webp)$/i.exec(nome)?.[0]?.toLowerCase() ?? '.png';
    const arquivo = `${slug}-${Date.now()}${extensao}`;
    await mkdir(PASTA_TEXTURAS, { recursive: true });
    await writeFile(join(PASTA_TEXTURAS, arquivo), binario);

    const url = `/texturas/${arquivo}`;
    // a textura enviada é usada como está: liga o mapa e desliga a tinta da cor
    const atual = await ingredienteRepository.renderDe(slug);
    const params = { ...((atual?.params ?? {}) as Record<string, unknown>), textura: true, tinta: false };
    await ingredienteService.salvarRender(slug, { textura_url: url, params } as never);
    return { url };
  },

  listar: async (): Promise<Ingrediente[]> => {
    const linhas = await ingredienteRepository.listar(true);
    return linhas.map(montar);
  },

  porSlug: async (slug: string): Promise<Ingrediente> => {
    const linha = await ingredienteRepository.porSlug(slug);
    if (!linha) throw new NaoEncontradoError(`Ingrediente ${slug} não encontrado`);
    return montar(linha);
  },

  atualizarPreco: async (slug: string, preco: number): Promise<void> => {
    const alteradas = await ingredienteRepository.atualizarPreco(slug, preco);
    if (!alteradas) throw new NaoEncontradoError(`Ingrediente ${slug} não encontrado`);
  },

  atualizarCusto: async (slug: string, custoKg: number): Promise<void> => {
    const alteradas = await ingredienteRepository.atualizarCusto(slug, custoKg);
    if (!alteradas) throw new NaoEncontradoError(`Ingrediente ${slug} não encontrado`);
  },

  definirClasse: async (slug: string, classe: string): Promise<void> => {
    const alteradas = await ingredienteRepository.definirClasse(slug, classe);
    if (!alteradas) throw new NaoEncontradoError(`Ingrediente ${slug} não encontrado`);
  },

  criar: async (dados: {
    nome: string;
    classe: string;
    tipo: string;
    preco_porcao: number;
    custo_kg: number;
    gramas_porcao: number;
    cor?: string;
  }) => {
    const slug = dados.nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    if (!slug) throw new ValidacaoError('Nome do ingrediente inválido');

    const existente = await ingredienteRepository.porSlug(slug);
    if (existente) throw new ValidacaoError(`Já existe um ingrediente chamado ${dados.nome}`);

    const params = completarReceita(
      { tipo: dados.tipo, ...(dados.cor ? { cor: dados.cor } : {}) } as ReceitaParams,
      dados.tipo,
    );

    await ingredienteRepository.criar({
      slug,
      nome: dados.nome,
      classe: dados.classe,
      precoPorcao: dados.preco_porcao,
      custoKg: dados.custo_kg,
      gramasPorcao: dados.gramas_porcao,
      params,
    });

    return { id: slug, nome: dados.nome, classe: dados.classe, tipo: params.tipo, params };
  },

  remover: async (slug: string): Promise<void> => {
    const removidos = await ingredienteRepository.remover(slug);
    if (!removidos) throw new NaoEncontradoError(`Ingrediente ${slug} não encontrado`);
  },

  definirAtivo: async (slug: string, ativo: boolean): Promise<void> => {
    const alteradas = await ingredienteRepository.definirAtivo(slug, ativo);
    if (!alteradas) throw new NaoEncontradoError(`Ingrediente ${slug} não encontrado`);
  },
};

export default ingredienteService;
