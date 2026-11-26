import { query } from '../../../config/db.js';
import { ValidacaoError } from '../../../shared/errors/app-error.js';
import pedidoRepository from '../repositories/pedido.repository.js';

// preço de pedido é calculado AQUI. O cliente manda só o que quer (tamanho, sabor,
// borda, ingredientes, bebidas) e o valor sai do banco — nenhum preço vem do front.

export interface ItemEntrada {
  tipo: 'pizza' | 'bebida' | 'extra';
  tamanho?: string;
  sabor?: string | null;
  sabores?: (string | null)[];
  borda?: string | null;
  ingredientes?: { slug: string; porcoes: number }[];
  partes?: number;
  partesInfo?: { sabor?: string | null; ingredientes?: { slug: string; porcoes: number }[] }[];
  slug?: string;
  qtd?: number;
}

export interface ItemResolvido {
  nome: string;
  detalhe: string | null;
  qtd: number;
  preco: number;
  tipo: string | null;
  // o que vai na pizza, parte por parte: a cozinha precisa disso para montar
  composicao: string[];
}

interface ProdutoPreco {
  id: number;
  slug: string;
  nome: string;
  detalhe: string | null;
  categoria: string;
  precos: Record<string, number>;
}

const precoUnico = (precos: Record<string, number>): number => precos.u ?? Object.values(precos)[0] ?? 0;

const produtosPorSlug = async (slugs: string[]): Promise<Map<string, ProdutoPreco>> => {
  if (!slugs.length) return new Map();
  const linhas = await query<ProdutoPreco>(
    `SELECT p.id_produto AS id, p.slug, p.nome, p.detalhe, c.nome AS categoria,
            COALESCE(json_object_agg(t.slug, ROUND(pp.valor * 100)::int)
                     FILTER (WHERE t.slug IS NOT NULL), '{}'::json) AS precos
       FROM produto p
       JOIN categoria c ON c.id_categoria = p.id_categoria
       LEFT JOIN preco_produto pp ON pp.id_produto = p.id_produto
       LEFT JOIN tamanho t ON t.id_tamanho = pp.id_tamanho
      WHERE p.slug = ANY($1::text[])
      GROUP BY p.id_produto, p.slug, p.nome, p.detalhe, c.nome`,
    [slugs],
  );
  return new Map(linhas.map((l) => [l.slug, l]));
};

const ingredientesPorSlug = async (slugs: string[]) => {
  if (!slugs.length) return new Map<string, { nome: string; preco: number }>();
  const linhas = await query<{ slug: string; nome: string; preco: number }>(
    `SELECT slug, nome, preco_porcao AS preco FROM ingrediente WHERE slug = ANY($1::text[])`,
    [slugs],
  );
  return new Map(linhas.map((l) => [l.slug, { nome: l.nome, preco: l.preco }]));
};

// receita do sabor pronto: ingrediente que já está nela não é cobrado de novo
const receitaDoSabor = async (slug: string): Promise<Set<string>> => {
  const linhas = await receitaDetalhada(slug);
  return new Set(linhas.map((l) => l.slug));
};

const receitaDetalhada = async (slug: string): Promise<{ slug: string; nome: string; porcoes: number }[]> =>
  query<{ slug: string; nome: string; porcoes: number }>(
    `SELECT i.slug, i.nome, COALESCE(si.porcoes, 1)::int AS porcoes
       FROM sabor_ingrediente si
       JOIN produto p ON p.id_produto = si.id_produto
       JOIN ingrediente i ON i.id_ingrediente = si.id_ingrediente
      WHERE p.slug = $1
      ORDER BY si.ordem`,
    [slug],
  );

const exigir = <T>(valor: T | undefined, mensagem: string): T => {
  if (valor === undefined || valor === null || valor === '') throw new ValidacaoError(mensagem);
  return valor;
};

export const precoPedidoService = {
  // taxa, frete grátis e desconto por faixa também são do servidor
  totais: async (subtotal: number, tipo: string): Promise<{ subtotal: number; taxa: number; desconto: number; total: number }> => {
    const regra = await pedidoRepository.regraDeCobranca();
    const gratis = regra.freteGratisAcima > 0 && subtotal >= regra.freteGratisAcima;
    const taxa = tipo === 'entrega' && !gratis ? regra.taxaBase : 0;
    // a faixa de desconto é do banco: mesma function que a procedure de pedido usa
    const desconto = await pedidoRepository.descontoCentavos(subtotal);
    return { subtotal, taxa, desconto, total: subtotal + taxa - desconto };
  },

  // devolve os itens com nome e preço do banco + o subtotal
  calcular: async (entrada: ItemEntrada[]): Promise<{ itens: ItemResolvido[]; subtotal: number }> => {
    if (!entrada.length) throw new ValidacaoError('Pedido sem item');

    const tamanhos = await query<{ slug: string; nome: string; medida: string | null; fator: number }>(
      `SELECT slug, nome, COALESCE(diametro_cm::text, '') || ' cm' AS medida, COALESCE(fator, 1)::float8 AS fator
         FROM tamanho`,
    );
    const porTamanho = new Map(tamanhos.map((t) => [t.slug, t]));

    const slugsProduto = new Set<string>();
    for (const item of entrada) {
      if (item.sabor) slugsProduto.add(item.sabor);
      for (const s of item.sabores ?? []) if (s) slugsProduto.add(s);
      if (item.borda) slugsProduto.add(`borda-${item.borda}`);
      if (item.tipo === 'bebida' && item.slug) slugsProduto.add(item.slug);
    }
    slugsProduto.add('monte-a-sua');

    const slugsIngrediente = new Set<string>();
    for (const item of entrada) {
      for (const i of item.ingredientes ?? []) slugsIngrediente.add(i.slug);
      if (item.tipo === 'extra' && item.slug) slugsIngrediente.add(item.slug);
    }

    const produtos = await produtosPorSlug([...slugsProduto]);
    const ingredientes = await ingredientesPorSlug([...slugsIngrediente]);

    const itens: ItemResolvido[] = [];

    for (const item of entrada) {
      if (item.tipo === 'pizza') {
        const tamanho = porTamanho.get(String(item.tamanho));
        if (!tamanho) throw new ValidacaoError(`Tamanho ${item.tamanho} não existe`);

        const sabores = (item.sabores ?? []).filter(Boolean) as string[];
        const saboresValidos = sabores.length ? sabores : item.sabor ? [item.sabor] : [];
        // parte montada à mão não tem sabor pronto: as partes vêm explícitas da tela
        const partesInfo = item.partesInfo?.length ? item.partesInfo : null;
        const partes = Math.max(1, item.partes ?? partesInfo?.length ?? saboresValidos.length);

        let pizza = 0;
        if (saboresValidos.length) {
          // sabor pronto manda no preço; com mais de um, cobra o mais caro
          const precos = saboresValidos.map((slug) => {
            const produto = produtos.get(slug);
            if (!produto) throw new ValidacaoError(`Sabor ${slug} não existe`);
            return produto.precos[tamanho.slug] ?? precoUnico(produto.precos);
          });
          pizza = Math.max(...precos);
        } else {
          // montada do zero: preço base da montagem × fator do tamanho
          const base = produtos.get('monte-a-sua');
          if (!base) throw new ValidacaoError('Preço de montagem não cadastrado');
          pizza = Math.round(precoUnico(base.precos) * tamanho.fator);
        }

        // ingredientes fora da receita: porção ÷ número de partes
        const naReceita = saboresValidos.length === 1 ? await receitaDoSabor(saboresValidos[0]!) : new Set<string>();
        for (const extra of item.ingredientes ?? []) {
          if (naReceita.has(extra.slug) || !extra.porcoes) continue;
          const ingrediente = ingredientes.get(extra.slug);
          if (!ingrediente) throw new ValidacaoError(`Ingrediente ${extra.slug} não existe`);
          pizza += Math.round((ingrediente.preco * extra.porcoes) / partes);
        }

        const borda = item.borda ? produtos.get(`borda-${item.borda}`) : null;
        if (item.borda && !borda) throw new ValidacaoError(`Borda ${item.borda} não existe`);
        if (borda) pizza += precoUnico(borda.precos);

        const nome = partes > 1
          ? `Pizza ${partes} sabores · ${tamanho.nome.toLowerCase()}`
          : saboresValidos.length
            ? `Pizza de ${produtos.get(saboresValidos[0]!)!.nome.toLowerCase()} · ${tamanho.nome.toLowerCase()}`
            : `Pizza montada · ${tamanho.nome.toLowerCase()}`;

        // composição: sabor de cada parte + o que vai nela (é o que a cozinha lê)
        const composicao: string[] = [];
        const extrasManuais = (item.ingredientes ?? [])
          .filter((e) => e.porcoes > 0)
          .map((e) => ({ nome: ingredientes.get(e.slug)?.nome ?? e.slug, porcoes: e.porcoes }));

        if (partesInfo) {
          for (let indice = 0; indice < partesInfo.length; indice += 1) {
            const info = partesInfo[indice]!;
            const rotulo = `${indice + 1}ª parte · `;
            if (info.sabor) {
              const produto = produtos.get(info.sabor);
              const receita = await receitaDetalhada(info.sabor);
              const lista = receita.map((r) => (r.porcoes > 1 ? `${r.nome} (${r.porcoes}×)` : r.nome)).join(', ');
              composicao.push(`${rotulo}${produto?.nome ?? info.sabor}: ${lista || 'sem ingredientes cadastrados'}`);
            } else {
              const manuais = (info.ingredientes ?? [])
                .filter((e) => e.porcoes > 0)
                .map((e) => {
                  const nome = ingredientes.get(e.slug)?.nome ?? e.slug;
                  return e.porcoes > 1 ? `${nome} (${e.porcoes}×)` : nome;
                });
              composicao.push(`${rotulo}montada: ${manuais.join(', ') || 'sem ingredientes'}`);
            }
          }
        } else if (saboresValidos.length) {
          for (let indice = 0; indice < saboresValidos.length; indice += 1) {
            const slug = saboresValidos[indice]!;
            const produto = produtos.get(slug);
            const receita = await receitaDetalhada(slug);
            const rotulo = saboresValidos.length > 1 ? `${indice + 1}ª parte · ` : '';
            const lista = receita.map((r) => (r.porcoes > 1 ? `${r.nome} (${r.porcoes}×)` : r.nome)).join(', ');
            composicao.push(`${rotulo}${produto?.nome ?? slug}: ${lista || 'sem ingredientes cadastrados'}`);
          }
          const foraDaReceita = extrasManuais.filter((e) => !naReceita.has(e.nome) && !saboresValidos.some((s) => s === e.nome));
          for (const extra of foraDaReceita) composicao.push(`+ ${extra.nome}${extra.porcoes > 1 ? ` (${extra.porcoes}×)` : ''}`);
        } else if (extrasManuais.length) {
          composicao.push(extrasManuais.map((e) => `${e.nome}${e.porcoes > 1 ? ` (${e.porcoes}×)` : ''}`).join(', '));
        }

        itens.push({
          nome,
          detalhe: borda ? borda.nome : tamanho.medida || null,
          qtd: 1,
          preco: pizza,
          tipo: 'pizza',
          composicao,
        });
        continue;
      }

      if (item.tipo === 'bebida') {
        const slug = exigir(item.slug, 'Bebida sem identificação');
        const produto = produtos.get(slug);
        if (!produto) throw new ValidacaoError(`Bebida ${slug} não existe`);
        itens.push({
          nome: produto.nome,
          detalhe: produto.detalhe,
          qtd: Math.max(1, Number(item.qtd ?? 1)),
          preco: precoUnico(produto.precos),
          tipo: 'bebida',
          composicao: [],
        });
        continue;
      }

      const slug = exigir(item.slug, 'Ingrediente sem identificação');
      const ingrediente = ingredientes.get(slug);
      if (!ingrediente) throw new ValidacaoError(`Ingrediente ${slug} não existe`);
      itens.push({
        nome: ingrediente.nome,
        detalhe: 'porção extra',
        qtd: Math.max(1, Number(item.qtd ?? 1)),
        preco: ingrediente.preco,
        tipo: 'extra',
        composicao: [],
      });
    }

    const subtotal = itens.reduce((soma, i) => soma + i.preco * i.qtd, 0);
    return { itens, subtotal };
  },
};

export default precoPedidoService;
