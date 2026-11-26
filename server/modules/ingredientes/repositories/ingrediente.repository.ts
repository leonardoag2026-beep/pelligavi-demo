import { query, transacao, um } from '../../../config/db.js';

export interface IngredienteLinha {
  id: number;
  slug: string;
  nome: string;
  classe: string;
  custo_kg: number;
  gramas_porcao: number;
  preco_porcao: number;
  ativo: boolean;
  ordem: number;
  imagem: string | null;
  preco_kg: number | null;
}

const CAMPOS = `
  id_ingrediente AS id,
  slug,
  nome,
  classe,
  custo_kg,
  gramas_porcao,
  preco_porcao,
  ativo,
  ordem,
  imagem,
  preco_kg
`;

export interface RenderLinha {
  slug: string;
  geometria: string;
  params: Record<string, unknown>;
  modelo_url: string | null;
  textura_url: string | null;
}

export interface RenderDados {
  geometria?: string;
  params?: Record<string, unknown>;
  modelo_url?: string | null;
  textura_url?: string | null;
}

export const ingredienteRepository = {
  listar: (somenteAtivos = true) =>
    query<IngredienteLinha>(
      `SELECT ${CAMPOS} FROM ingrediente
        ${somenteAtivos ? 'WHERE ativo' : ''}
        ORDER BY ordem, nome`,
    ),

  porSlug: (slug: string) =>
    um<IngredienteLinha>(`SELECT ${CAMPOS} FROM ingrediente WHERE slug = $1`, [slug]),

  porId: (id: number) =>
    um<IngredienteLinha>(`SELECT ${CAMPOS} FROM ingrediente WHERE id_ingrediente = $1`, [id]),

  atualizarPreco: async (slug: string, precoPorcao: number): Promise<number> => {
    const linhas = await query<{ id: number }>(
      `UPDATE ingrediente SET preco_porcao = $2 WHERE slug = $1 RETURNING id_ingrediente AS id`,
      [slug, precoPorcao],
    );
    return linhas.length;
  },

  atualizarCusto: async (slug: string, custoKg: number): Promise<number> => {
    const linhas = await query<{ id: number }>(
      `UPDATE ingrediente SET custo_kg = $2 WHERE slug = $1 RETURNING id_ingrediente AS id`,
      [slug, custoKg],
    );
    return linhas.length;
  },

  criar: async (dados: {
    slug: string;
    nome: string;
    classe: string;
    precoPorcao: number;
    custoKg: number;
    gramasPorcao: number;
    params: Record<string, unknown>;
  }): Promise<number> =>
    transacao(async (cli) => {
      const novo = await cli.query<{ id: number }>(
        `INSERT INTO ingrediente (slug, nome, classe, preco_porcao, custo_kg, gramas_porcao, ordem)
         VALUES ($1, $2, $3, $4, $5, $6, (SELECT COALESCE(MAX(ordem), 0) + 1 FROM ingrediente))
         RETURNING id_ingrediente AS id`,
        [dados.slug, dados.nome, dados.classe, dados.precoPorcao, dados.custoKg, dados.gramasPorcao],
      );
      const id = novo.rows[0].id;
      await cli.query(
        `INSERT INTO ingrediente_render (id_ingrediente, geometria, params)
         VALUES ($1, 'auto', $2::jsonb)
         ON CONFLICT (id_ingrediente) DO UPDATE SET params = EXCLUDED.params, atualizado_em = now()`,
        [id, JSON.stringify(dados.params)],
      );
      return id;
    }),

  atualizarPeso: async (slug: string, gramas: number, precoKg: number): Promise<number> => {
    const linhas = await query<{ id: number }>(
      `UPDATE ingrediente
          SET gramas_porcao = $2,
              preco_kg      = $3,
              preco_porcao  = ROUND($3::int::numeric * $2::int / 1000)::int
        WHERE slug = $1
        RETURNING id_ingrediente AS id`,
      [slug, gramas, precoKg],
    );
    return linhas.length;
  },

  definirImagem: async (slug: string, url: string): Promise<number> => {
    const linhas = await query<{ id: number }>(
      `UPDATE ingrediente SET imagem = $2 WHERE slug = $1 RETURNING id_ingrediente AS id`,
      [slug, url],
    );
    return linhas.length;
  },

  listarRender: () =>
    query<RenderLinha>(
      `SELECT i.slug,
              r.geometria,
              r.params,
              r.modelo_url,
              r.textura_url
         FROM ingrediente_render r
         JOIN ingrediente i ON i.id_ingrediente = r.id_ingrediente
        ORDER BY i.ordem, i.nome`,
    ),

  renderDe: (slug: string) =>
    um<RenderLinha>(
      `SELECT i.slug, r.geometria, r.params, r.modelo_url, r.textura_url
         FROM ingrediente_render r
         JOIN ingrediente i ON i.id_ingrediente = r.id_ingrediente
        WHERE i.slug = $1`,
      [slug],
    ),

  salvarRender: async (slug: string, dados: RenderDados): Promise<number> => {
    const linhas = await query<{ id: number }>(
      `INSERT INTO ingrediente_render (id_ingrediente, geometria, params, modelo_url, textura_url)
       SELECT id_ingrediente, COALESCE($2, 'auto'), COALESCE($3::jsonb, '{}'::jsonb), $4, $5 FROM ingrediente WHERE slug = $1
       ON CONFLICT (id_ingrediente) DO UPDATE
          SET geometria     = COALESCE($2, ingrediente_render.geometria),
              params        = COALESCE($3::jsonb, ingrediente_render.params),
              modelo_url    = COALESCE(EXCLUDED.modelo_url, ingrediente_render.modelo_url),
              textura_url   = COALESCE(EXCLUDED.textura_url, ingrediente_render.textura_url),
              atualizado_em = now()
       RETURNING id_render AS id`,
      [slug, dados.geometria ?? null, dados.params == null ? null : JSON.stringify(dados.params), dados.modelo_url ?? null, dados.textura_url ?? null],
    );
    return linhas.length;
  },

  definirClasse: async (slug: string, classe: string): Promise<number> => {
    const linhas = await query<{ id: number }>(
      `UPDATE ingrediente SET classe = $2 WHERE slug = $1 RETURNING id_ingrediente AS id`,
      [slug, classe],
    );
    return linhas.length;
  },

  // apaga o ingrediente e o que aponta para ele (receitas, render, compras).
  // Pedidos antigos não guardam id de ingrediente: nome e composição ficam gravados.
  remover: async (slug: string): Promise<number> => {
    const linhas = await transacao(async (cliente) => {
      const alvo = await cliente.query<{ id: number }>(
        `SELECT id_ingrediente AS id FROM ingrediente WHERE slug = $1`,
        [slug],
      );
      const id = alvo.rows[0]?.id;
      if (!id) return 0;
      await cliente.query(`DELETE FROM sabor_ingrediente WHERE id_ingrediente = $1`, [id]);
      await cliente.query(`DELETE FROM ingrediente_render WHERE id_ingrediente = $1`, [id]);
      await cliente.query(`DELETE FROM compra_insumo WHERE id_ingrediente = $1`, [id]);
      await cliente.query(`DELETE FROM ingrediente WHERE id_ingrediente = $1`, [id]);
      return 1;
    });
    return linhas;
  },

  definirAtivo: async (slug: string, ativo: boolean): Promise<number> => {
    const linhas = await query<{ id: number }>(
      `UPDATE ingrediente SET ativo = $2 WHERE slug = $1 RETURNING id_ingrediente AS id`,
      [slug, ativo],
    );
    return linhas.length;
  },
};

export default ingredienteRepository;
