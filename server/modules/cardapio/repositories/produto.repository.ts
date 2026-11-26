import { query, transacao, um } from '../../../config/db.js';
import { ValidacaoError } from '../../../shared/errors/app-error.js';

export interface ProdutoLinha {
  id: number;
  nome: string;
  slug: string;
  ordem: number;
  detalhe: string | null;
  arte: string | null;
  imagem: string | null;
  precos: Record<string, number>;
}

export interface IngredienteDaReceita {
  slug: string;
  nome: string;
  gramas: number;
  custo_kg: number;
  porcoes: number;
  ordem: number;
}

export interface ItemReceita {
  slug: string;
  gramas: number;
  porcoes: number;
}

const SQL_PRODUTOS = `
  SELECT p.id_produto                                   AS id,
         p.nome,
         p.slug,
         p.ordem,
         p.detalhe,
         p.arte,
         p.imagem,
         COALESCE(
           json_object_agg(t.slug, ROUND(pp.valor * 100)::int)
             FILTER (WHERE t.slug IS NOT NULL), '{}'::json
         )                                              AS precos
    FROM produto p
    JOIN categoria c ON c.id_categoria = p.id_categoria
    LEFT JOIN preco_produto pp ON pp.id_produto = p.id_produto
    LEFT JOIN tamanho t ON t.id_tamanho = pp.id_tamanho AND t.slug IS NOT NULL
   WHERE c.nome = $1 AND p.ativo
   GROUP BY p.id_produto
   ORDER BY p.ordem, p.nome
`;

export const produtoRepository = {
  definirImagem: async (slug: string, url: string): Promise<number> => {
    const linhas = await query<{ id: number }>(
      `UPDATE produto SET imagem = $2 WHERE slug = $1 RETURNING id_produto AS id`,
      [slug, url],
    );
    return linhas.length;
  },

  porCategoria: (categoria: string) => query<ProdutoLinha>(SQL_PRODUTOS, [categoria]),

  porSlug: (slug: string) =>
    um<ProdutoLinha>(
      `SELECT p.id_produto AS id, p.nome, p.slug, p.ordem, p.detalhe, p.arte, p.imagem,
              COALESCE(json_object_agg(t.slug, ROUND(pp.valor * 100)::int)
                       FILTER (WHERE t.slug IS NOT NULL), '{}'::json) AS precos
         FROM produto p
         JOIN categoria c ON c.id_categoria = p.id_categoria
         LEFT JOIN preco_produto pp ON pp.id_produto = p.id_produto
         LEFT JOIN tamanho t ON t.id_tamanho = pp.id_tamanho AND t.slug IS NOT NULL
        WHERE p.slug = $1
        GROUP BY p.id_produto`,
      [slug],
    ),

  receitaDoProduto: (idProduto: number) =>
    query<IngredienteDaReceita>(
      `SELECT i.slug, i.nome, si.gramas, si.porcoes, i.custo_kg
         FROM sabor_ingrediente si
         JOIN ingrediente i ON i.id_ingrediente = si.id_ingrediente
        WHERE si.id_produto = $1
        ORDER BY si.ordem, i.ordem`,
      [idProduto],
    ),

  receitaCompleta: (idProduto: number) =>
    query<IngredienteDaReceita>(
      `SELECT i.slug, i.nome, si.gramas, si.porcoes, si.ordem, i.custo_kg
         FROM sabor_ingrediente si
         JOIN ingrediente i ON i.id_ingrediente = si.id_ingrediente
        WHERE si.id_produto = $1
        ORDER BY si.ordem, i.nome`,
      [idProduto],
    ),

  renomear: async (slug: string, nome: string, ativo: boolean): Promise<number> => {
    const linhas = await query<{ id: number }>(
      `UPDATE produto SET nome = $2, ativo = $3 WHERE slug = $1 RETURNING id_produto AS id`,
      [slug, nome, ativo],
    );
    return linhas.length;
  },

  substituirReceita: async (idProduto: number, itens: ItemReceita[]): Promise<void> => {
    await transacao(async (cli) => {
      await cli.query('DELETE FROM sabor_ingrediente WHERE id_produto = $1', [idProduto]);
      let ordem = 1;
      for (const item of itens) {
        const inseridas = await cli.query(
          `INSERT INTO sabor_ingrediente (id_produto, id_ingrediente, gramas, porcoes, ordem)
           SELECT $1, i.id_ingrediente, $3, $4, $5 FROM ingrediente i WHERE i.slug = $2
           RETURNING 1`,
          [idProduto, item.slug, item.gramas, item.porcoes, ordem],
        );
        // slug inexistente antes sumia calado: o sabor ficava sem o ingrediente
        if (!inseridas.rows.length) throw new ValidacaoError(`Ingrediente ${item.slug} não existe`);
        ordem += 1;
      }
    });
  },

  criarSabor: async (nome: string, slug: string, itens: ItemReceita[]): Promise<number> => {
    const id = await transacao(async (cli) => {
      const novo = await cli.query<{ id: number }>(
        `INSERT INTO produto (id_categoria, nome, slug, ordem)
         VALUES ((SELECT id_categoria FROM categoria WHERE nome = 'Pizza'),
                 $1,
                 $2,
                 (SELECT COALESCE(MAX(ordem), 0) + 1 FROM produto))
         RETURNING id_produto AS id`,
        [nome, slug],
      );
      const idProduto = novo.rows[0].id;
      await cli.query(
        `INSERT INTO preco_produto (id_produto, id_tamanho, valor)
         SELECT $1, id_tamanho, 0 FROM tamanho WHERE slug <> 'u' ORDER BY ordem`,
        [idProduto],
      );
      let ordem = 1;
      for (const item of itens) {
        const inseridas = await cli.query(
          `INSERT INTO sabor_ingrediente (id_produto, id_ingrediente, gramas, porcoes, ordem)
           SELECT $1, i.id_ingrediente, $3, $4, $5 FROM ingrediente i WHERE i.slug = $2
           RETURNING 1`,
          [idProduto, item.slug, item.gramas, item.porcoes, ordem],
        );
        if (!inseridas.rows.length) throw new ValidacaoError(`Ingrediente ${item.slug} não existe`);
        ordem += 1;
      }
      return idProduto;
    });
    return id;
  },

  // apaga o sabor e o que aponta para ele. Pedido antigo guarda nome/composição do item,
  // então o histórico continua legível; só o vínculo com o produto sai.
  criarBebida: async (nome: string, slug: string, detalhe: string, preco: number): Promise<number> =>
    transacao(async (cli) => {
      const novo = await cli.query<{ id: number }>(
        `INSERT INTO produto (id_categoria, nome, slug, detalhe, ordem)
         VALUES ((SELECT id_categoria FROM categoria WHERE nome = 'Bebida'),
                 $1, $2, $3,
                 (SELECT COALESCE(MAX(ordem), 0) + 1 FROM produto))
         RETURNING id_produto AS id`,
        [nome, slug, detalhe],
      );
      const id = novo.rows[0].id;
      await cli.query(
        `INSERT INTO preco_produto (id_produto, id_tamanho, valor)
         SELECT $1, id_tamanho, ROUND($2::numeric / 100, 2) FROM tamanho WHERE slug = 'u'`,
        [id, preco],
      );
      return id;
    }),

  salvarBebida: async (slug: string, nome: string, detalhe: string, preco: number): Promise<number> =>
    transacao(async (cli) => {
      const salvo = await cli.query<{ id: number }>(
        `UPDATE produto SET nome = $2, detalhe = $3 WHERE slug = $1 RETURNING id_produto AS id`,
        [slug, nome, detalhe],
      );
      if (!salvo.rows.length) return 0;
      const id = salvo.rows[0].id;
      await cli.query(
        `INSERT INTO preco_produto (id_produto, id_tamanho, valor)
         SELECT $1, id_tamanho, ROUND($2::numeric / 100, 2) FROM tamanho WHERE slug = 'u'
         ON CONFLICT (id_produto, id_tamanho) DO UPDATE SET valor = EXCLUDED.valor`,
        [id, preco],
      );
      return 1;
    }),

  removerProduto: async (slug: string, categoria: string): Promise<number> => {
    const removidos = await transacao(async (cli) => {
      const alvo = await cli.query<{ id: number }>(
        `SELECT p.id_produto AS id FROM produto p
           JOIN categoria c ON c.id_categoria = p.id_categoria
          WHERE p.slug = $1 AND c.nome = $2`,
        [slug, categoria],
      );
      const id = alvo.rows[0]?.id;
      if (!id) return 0;
      await cli.query(`DELETE FROM item_pedido_produto WHERE id_produto = $1`, [id]);
      await cli.query(`DELETE FROM sabor_ingrediente WHERE id_produto = $1`, [id]);
      await cli.query(`DELETE FROM preco_produto WHERE id_produto = $1`, [id]);
      await cli.query(`DELETE FROM produto WHERE id_produto = $1`, [id]);
      return 1;
    });
    return removidos;
  },

  porSlugCompleto: (slug: string) =>
    um<ProdutoLinha & { ativo: boolean }>(
      `SELECT p.id_produto AS id, p.nome, p.slug, p.ordem, p.detalhe, p.arte, p.imagem, p.ativo,
              COALESCE(json_object_agg(t.slug, ROUND(pp.valor * 100)::int)
                       FILTER (WHERE t.slug IS NOT NULL), '{}'::json) AS precos
         FROM produto p
         LEFT JOIN preco_produto pp ON pp.id_produto = p.id_produto
         LEFT JOIN tamanho t ON t.id_tamanho = pp.id_tamanho AND t.slug IS NOT NULL
        WHERE p.slug = $1
        GROUP BY p.id_produto`,
      [slug],
    ),

  atualizarPreco: async (slug: string, tamanho: string, valorCentavos: number): Promise<number> => {
    const linhas = await query<{ id_produto: number }>(
      `UPDATE preco_produto pp
          SET valor = ROUND($3::numeric / 100, 2)
         FROM produto p, tamanho t
        WHERE p.slug = $1
          AND t.slug = $2
          AND pp.id_produto = p.id_produto
          AND pp.id_tamanho = t.id_tamanho
        RETURNING pp.id_produto`,
      [slug, tamanho, valorCentavos],
    );
    return linhas.length;
  },

  definirAtivo: async (slug: string, ativo: boolean): Promise<number> => {
    const linhas = await query<{ id_produto: number }>(
      `UPDATE produto SET ativo = $2 WHERE slug = $1 RETURNING id_produto`,
      [slug, ativo],
    );
    return linhas.length;
  },
};

export default produtoRepository;
