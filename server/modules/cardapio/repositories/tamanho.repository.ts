import { query, transacao } from '../../../config/db.js';

export interface TamanhoLinha {
  id: string;
  nome: string;
  medida: string;
  fatias: number;
  fator: number;
  ordem: number;
}

export const tamanhoRepository = {
  dePizza: () =>
    query<TamanhoLinha>(
      `SELECT slug                                        AS id,
              nome,
              CONCAT(diametro_cm, ' cm')                  AS medida,
              fatias,
              fator::float8                               AS fator,
              ordem
         FROM tamanho
        WHERE slug IS NOT NULL AND slug <> 'u' AND COALESCE(diametro_cm, 0) > 0
        ORDER BY ordem`,
    ),

  porSlug: async (slug: string): Promise<TamanhoLinha | null> => {
    const linhas = await query<TamanhoLinha>(
      `SELECT slug, nome, CONCAT(COALESCE(diametro_cm, 0), ' cm') AS medida,
              COALESCE(fatias, 0) AS fatias, COALESCE(fator, 1)::float8 AS fator, ordem
         FROM tamanho WHERE slug = $1`,
      [slug],
    );
    return linhas[0] ?? null;
  },

  atualizar: async (slug: string, nome: string, diametroCm: number, fatias: number): Promise<number> => {
    const linhas = await query<{ id: number }>(
      `UPDATE tamanho
          SET nome = $2, diametro_cm = $3, fatias = $4
        WHERE slug = $1
        RETURNING id_tamanho AS id`,
      [slug, nome, diametroCm, fatias],
    );
    return linhas.length;
  },

  criar: async (slug: string, nome: string, diametroCm: number, fatias: number, fator: number): Promise<void> =>
    transacao(async (cli) => {
      const novo = await cli.query<{ id: number }>(
        `INSERT INTO tamanho (nome, slug, ordem, diametro_cm, fatias, fator)
         VALUES ($1, $2, (SELECT COALESCE(MAX(ordem), 0) + 1 FROM tamanho WHERE slug <> 'u'),
                 $3, $4, $5)
         RETURNING id_tamanho AS id`,
        [nome, slug, diametroCm, fatias, fator],
      );
      await cli.query(
        `INSERT INTO preco_produto (id_produto, id_tamanho, valor)
         SELECT p.id_produto, $1, 0
           FROM produto p
           JOIN categoria c ON c.id_categoria = p.id_categoria
          WHERE c.nome = 'Pizza'`,
        [novo.rows[0].id],
      );
    }),

  remover: async (slug: string): Promise<number> =>
    transacao(async (cli) => {
      const alvo = await cli.query<{ id: number }>(
        `SELECT id_tamanho AS id FROM tamanho WHERE slug = $1 AND slug <> 'u'`,
        [slug],
      );
      if (!alvo.rows.length) return 0;
      const id = alvo.rows[0].id;
      await cli.query(`DELETE FROM preco_produto WHERE id_tamanho = $1`, [id]);
      const removidos = await cli.query(`DELETE FROM tamanho WHERE id_tamanho = $1`, [id]);
      return removidos.rowCount ?? 0;
    }),
};

export default tamanhoRepository;
