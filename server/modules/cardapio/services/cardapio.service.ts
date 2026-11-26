import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NaoEncontradoError, ValidacaoError } from '../../../shared/errors/app-error.js';
import produtoRepository from '../repositories/produto.repository.js';
import tamanhoRepository from '../repositories/tamanho.repository.js';

export interface Sabor {
  id: string;
  nome: string;
  precos: Record<string, number>;
  itens: string[];
  // a receita com porções por ingrediente é o que o montador usa para preencher o sabor
  receita: { id: string; porcoes: number; gramas: number }[];
  imagem: string | null;
  ativo: boolean;
}

export interface Bebida {
  id: string;
  nome: string;
  detalhe: string;
  preco: number;
  arte: string;
  imagem: string | null;
}

export interface Borda {
  id: string;
  nome: string;
  preco: number;
}

export interface Cardapio {
  tamanhos: { id: string; nome: string; medida: string; fatias: number; fator: number }[];
  sabores: Sabor[];
  bebidas: Bebida[];
  bordas: Borda[];
  montagem: { preco: number };
}

const PASTA_IMAGENS = join(process.cwd(), 'server', 'uploads', 'imagens');

const precoUnico = (precos: Record<string, number>): number => precos.u ?? Object.values(precos)[0] ?? 0;

const emSlug = (nome: string): string =>
  nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const cardapioService = {
  atualizarTamanho: async (slug: string, nome: string, diametroCm: number, fatias: number): Promise<void> => {
    const alteradas = await tamanhoRepository.atualizar(slug, nome, diametroCm, fatias);
    if (!alteradas) throw new NaoEncontradoError(`Tamanho ${slug} não encontrado`);
  },

  listar: async (): Promise<Cardapio> => {
    const [tamanhos, pizzas, bebidas, adicionais] = await Promise.all([
      tamanhoRepository.dePizza(),
      produtoRepository.porCategoria('Pizza'),
      produtoRepository.porCategoria('Bebida'),
      produtoRepository.porCategoria('Adicional'),
    ]);

    const base = pizzas.find((p) => p.slug === 'monte-a-sua');
    const saboresPizza = pizzas.filter((p) => p.slug !== 'monte-a-sua');
    const receitas = await Promise.all(saboresPizza.map((p) => produtoRepository.receitaDoProduto(p.id)));

    return {
      tamanhos: tamanhos.map(({ id, nome, medida, fatias, fator }) => ({ id, nome, medida, fatias, fator })),
      montagem: { preco: base ? precoUnico(base.precos) : 0 },
      sabores: saboresPizza.map((p, indice) => ({
        id: p.slug,
        nome: p.nome,
        precos: p.precos,
        itens: receitas[indice].map((i) => i.slug),
        receita: receitas[indice].map((i) => ({ id: i.slug, porcoes: i.porcoes, gramas: i.gramas })),
        imagem: p.imagem ?? null,
        ativo: true,
      })),
      bebidas: bebidas.map((b) => ({
        id: b.slug,
        nome: b.nome,
        detalhe: b.detalhe ?? '',
        preco: precoUnico(b.precos),
        arte: b.arte ?? 'lata',
        imagem: b.imagem,
      })),
      bordas: adicionais.map((a) => ({
        id: a.slug.replace(/^borda-/, ''),
        nome: a.nome,
        preco: precoUnico(a.precos),
      })),
    };
  },

  removerSabor: async (slug: string): Promise<void> => {
    const removidos = await produtoRepository.removerProduto(slug, 'Pizza');
    if (!removidos) throw new NaoEncontradoError(`Sabor ${slug} não encontrado`);
  },

  produto: async (slug: string) => {
    const produto = await produtoRepository.porSlug(slug);
    if (!produto) throw new NaoEncontradoError(`Produto ${slug} não encontrado`);
    const receita = await produtoRepository.receitaDoProduto(produto.id);
    const custoPorcao = receita.reduce((s, i) => s + Math.round((i.custo_kg * i.gramas) / 1000), 0);
    return {
      id: produto.slug,
      nome: produto.nome,
      detalhe: produto.detalhe,
      precos: produto.precos,
      receita,
      custo_porcao: custoPorcao,
    };
  },

  sabor: async (slug: string) => {
    const produto = await produtoRepository.porSlugCompleto(slug);
    if (!produto) throw new NaoEncontradoError(`Sabor ${slug} não encontrado`);
    const receita = await produtoRepository.receitaCompleta(produto.id);
    return {
      id: produto.slug,
      nome: produto.nome,
      ativo: produto.ativo,
      precos: produto.precos,
      receita: receita.map((i) => ({ id: i.slug, nome: i.nome, gramas: i.gramas, porcoes: i.porcoes })),
      imagem: produto.imagem,
    };
  },

  salvarSabor: async (
    slug: string,
    dados: { nome: string; ativo: boolean; precos: Record<string, number>; receita: { id: string; gramas: number; porcoes: number }[] },
  ) => {
    const produto = await produtoRepository.porSlugCompleto(slug);
    if (!produto) throw new NaoEncontradoError(`Sabor ${slug} não encontrado`);

    await produtoRepository.renomear(slug, dados.nome, dados.ativo);
    await produtoRepository.substituirReceita(
      produto.id,
      dados.receita.map((i) => ({ slug: i.id, gramas: i.gramas, porcoes: i.porcoes })),
    );
    for (const [tamanho, valor] of Object.entries(dados.precos)) {
      await produtoRepository.atualizarPreco(slug, tamanho, valor);
    }
    return cardapioService.sabor(slug);
  },

  criarSabor: async (dados: {
    nome: string;
    precos: Record<string, number>;
    receita: { id: string; gramas: number; porcoes: number }[];
  }) => {
    const slug = emSlug(dados.nome);
    if (!slug) throw new ValidacaoError('Nome do sabor inválido');
    const existente = await produtoRepository.porSlugCompleto(slug);
    if (existente) throw new ValidacaoError(`Já existe um sabor chamado ${dados.nome}`);

    const id = await produtoRepository.criarSabor(
      dados.nome,
      slug,
      dados.receita.map((i) => ({ slug: i.id, gramas: i.gramas, porcoes: i.porcoes })),
    );
    const criado = await produtoRepository.porSlugCompleto(slug);
    for (const [tamanho, valor] of Object.entries(dados.precos)) {
      if (criado) await produtoRepository.atualizarPreco(slug, tamanho, valor);
    }
    return { id, slug };
  },

  atualizarPreco: async (slug: string, tamanho: string, valorCentavos: number): Promise<void> => {
    const atualizadas = await produtoRepository.atualizarPreco(slug, tamanho, valorCentavos);
    if (!atualizadas) throw new NaoEncontradoError(`Sem preço de ${slug} para o tamanho ${tamanho}`);
  },

  definirAtivo: async (slug: string, ativo: boolean): Promise<void> => {
    const atualizados = await produtoRepository.definirAtivo(slug, ativo);
    if (!atualizados) throw new NaoEncontradoError(`Produto ${slug} não encontrado`);
  },

  criarBebida: async (dados: { nome: string; detalhe: string; preco: number }) => {
    const slug = emSlug(dados.nome);
    if (!slug) throw new ValidacaoError('Nome da bebida inválido');
    const existente = await produtoRepository.porSlug(slug);
    if (existente) throw new ValidacaoError(`Já existe um produto chamado ${dados.nome}`);

    await produtoRepository.criarBebida(dados.nome, slug, dados.detalhe, dados.preco);
    return { id: slug, nome: dados.nome, detalhe: dados.detalhe, preco: dados.preco };
  },

  salvarBebida: async (slug: string, dados: { nome: string; detalhe: string; preco: number }) => {
    const salvos = await produtoRepository.salvarBebida(slug, dados.nome, dados.detalhe, dados.preco);
    if (!salvos) throw new NaoEncontradoError(`Bebida ${slug} não encontrada`);
    return { id: slug, nome: dados.nome, detalhe: dados.detalhe, preco: dados.preco };
  },

  removerBebida: async (slug: string): Promise<void> => {
    const removidos = await produtoRepository.removerProduto(slug, 'Bebida');
    if (!removidos) throw new NaoEncontradoError(`Bebida ${slug} não encontrada`);
  },

  criarTamanho: async (dados: { nome: string; diametro_cm: number; fatias: number; fator: number }) => {
    const slug = emSlug(dados.nome);
    if (!slug || slug === 'u') throw new ValidacaoError('Nome do tamanho inválido');
    const existente = await tamanhoRepository.porSlug(slug);
    if (existente) throw new ValidacaoError(`Já existe um tamanho chamado ${dados.nome}`);

    await tamanhoRepository.criar(slug, dados.nome, dados.diametro_cm, dados.fatias, dados.fator);
    return { id: slug, nome: dados.nome, medida: `${dados.diametro_cm} cm`, fatias: dados.fatias, fator: dados.fator };
  },

  removerTamanho: async (slug: string): Promise<void> => {
    const removidos = await tamanhoRepository.remover(slug);
    if (!removidos) throw new NaoEncontradoError(`Tamanho ${slug} não encontrado ou já usado em pedidos`);
  },

  salvarImagemBebida: async (slug: string, nome: string, base64: string): Promise<{ url: string }> => {
    const limpo = base64.includes(',') ? base64.slice(base64.indexOf(',') + 1) : base64;
    const binario = Buffer.from(limpo, 'base64');
    if (binario.byteLength < 32) throw new ValidacaoError('Imagem inválida');

    const extensao = /[.](png|jpg|jpeg|webp|svg)$/i.exec(nome)?.[0]?.toLowerCase() ?? '.png';
    const arquivo = `${slug}-${Date.now()}${extensao}`;
    await mkdir(PASTA_IMAGENS, { recursive: true });
    await writeFile(join(PASTA_IMAGENS, arquivo), binario);

    const url = `/imagens/${arquivo}`;
    const alteradas = await produtoRepository.definirImagem(slug, url);
    if (!alteradas) throw new NaoEncontradoError(`Bebida ${slug} não encontrada`);
    return { url };
  },
};
export default cardapioService;
