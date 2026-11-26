import { query, um } from '../../../config/db.js';

export interface CaixaLinha {
  id: number;
  abertaEm: string;
  fechadaEm: string | null;
  valorInicial: number;
  valorEsperado: number | null;
  valorContado: number | null;
  porForma: Record<string, number> | null;
  observacao: string | null;
}

const SELECT_CAIXA = `
  SELECT id_caixa                                          AS id,
         to_char(aberto_em, 'YYYY-MM-DD"T"HH24:MI:SS')      AS "abertaEm",
         to_char(fechado_em, 'YYYY-MM-DD"T"HH24:MI:SS')     AS "fechadaEm",
         ROUND(valor_inicial * 100)::int                    AS "valorInicial",
         CASE WHEN valor_esperado IS NULL THEN NULL
              ELSE ROUND(valor_esperado * 100)::int END     AS "valorEsperado",
         CASE WHEN valor_contado IS NULL THEN NULL
              ELSE ROUND(valor_contado * 100)::int END      AS "valorContado",
         por_forma                                          AS "porForma",
         observacao
    FROM caixa
`;

export const caixaRepository = {
  aberto: () => um<CaixaLinha>(`${SELECT_CAIXA} WHERE fechado_em IS NULL ORDER BY id_caixa DESC LIMIT 1`),

  fechamentos: (limite = 20) =>
    query<CaixaLinha>(`${SELECT_CAIXA} WHERE fechado_em IS NOT NULL ORDER BY fechado_em DESC LIMIT $1`, [limite]),

  porId: (id: number) => um<CaixaLinha>(`${SELECT_CAIXA} WHERE id_caixa = $1`, [id]),

  abrir: async (valorInicial: number): Promise<number> => {
    const linha = await um<{ id: number }>(
      `INSERT INTO caixa (valor_inicial) VALUES ($1::numeric / 100) RETURNING id_caixa AS id`,
      [valorInicial],
    );
    return linha!.id;
  },

  fechar: async (id: number, dados: {
    valorEsperado: number;
    valorContado: number;
    porForma: Record<string, number>;
    observacao: string | null;
  }): Promise<void> => {
    await query(
      `UPDATE caixa
          SET fechado_em = NOW(),
              valor_esperado = $2::numeric / 100,
              valor_contado = $3::numeric / 100,
              por_forma = $4::jsonb,
              observacao = $5
        WHERE id_caixa = $1 AND fechado_em IS NULL`,
      [id, dados.valorEsperado, dados.valorContado, JSON.stringify(dados.porForma), dados.observacao],
    );
  },

  // movimento do período: pagamentos de pedidos não cancelados desde a abertura
  movimento: (desde: string | null) =>
    um<{ pedidos: number; total: number; porForma: Record<string, number> }>(
      `WITH venda AS (
         SELECT p.id_pedido, fp.nome AS forma, pg.valor
           FROM pedido p
           JOIN pagamento pg ON pg.id_pedido = p.id_pedido
           JOIN forma_pagamento fp ON fp.id_forma = pg.id_forma
           JOIN status_pedido sp ON sp.id_status = p.id_status
          WHERE sp.nome <> 'Cancelado'
            AND ($1::timestamp IS NULL OR p.data_hora >= $1::timestamp)
       )
       , por_pedido AS (
         -- uma linha por (pedido, forma): o valor de cada forma naquele pedido
         SELECT id_pedido, forma, ROUND(SUM(valor) * 100)::int AS centavos
           FROM venda GROUP BY id_pedido, forma
       )
       SELECT (SELECT COUNT(DISTINCT id_pedido) FROM por_pedido)::int  AS pedidos,
              COALESCE((SELECT SUM(centavos) FROM por_pedido), 0)::int  AS total,
              COALESCE(
                (SELECT jsonb_object_agg(forma, soma)
                   FROM (SELECT forma, SUM(centavos)::int AS soma FROM por_pedido GROUP BY forma) por_forma),
                '{}'::jsonb
              ) AS "porForma"`,
      [desde],
    ),
};

export default caixaRepository;
