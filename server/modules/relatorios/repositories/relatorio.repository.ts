import { query, um } from '../../../config/db.js';

export interface ResumoLinha {
  pedidos: number;
  total: number;
  ticket: number;
  tempoMedio: number | null;
}

const CANCELADO = `sp.nome <> 'Cancelado'`;

export const relatorioRepository = {
  resumo: (de: string | null, ate: string | null) =>
    um<ResumoLinha>(
      `WITH base AS (
         SELECT p.id_pedido, ROUND(p.total * 100)::int AS total, p.data_hora
           FROM pedido p
           JOIN status_pedido sp ON sp.id_status = p.id_status
          WHERE ${CANCELADO}
            AND ($1::timestamp IS NULL OR p.data_hora >= $1::timestamp)
            AND ($2::timestamp IS NULL OR p.data_hora < ($2::timestamp + INTERVAL '1 day'))
       ),
       preparo AS (
         SELECT p.id_pedido,
                EXTRACT(EPOCH FROM (MIN(h.data_hora) - p.data_hora)) AS segundos
           FROM pedido p
           JOIN historico_status h ON h.id_pedido = p.id_pedido
           JOIN status_pedido s ON s.id_status = h.id_status AND s.nome = 'Pronto'
          WHERE h.data_hora >= p.data_hora
            AND ($1::timestamp IS NULL OR p.data_hora >= $1::timestamp)
            AND ($2::timestamp IS NULL OR p.data_hora < ($2::timestamp + INTERVAL '1 day'))
          GROUP BY p.id_pedido, p.data_hora
       )
       SELECT (SELECT COUNT(*)::int FROM base)                        AS pedidos,
              (SELECT COALESCE(SUM(total), 0)::int FROM base)         AS total,
              (SELECT COALESCE(ROUND(AVG(total)), 0)::int FROM base)  AS ticket,
              (SELECT ROUND(AVG(segundos) * 1000)::int FROM preparo)  AS "tempoMedio"`,
      [de, ate],
    ),

  vendasPorDia: (de: string | null, ate: string | null) =>
    query<{ dia: string; total: number; pedidos: number }>(
      `SELECT to_char(date_trunc('day', p.data_hora), 'YYYY-MM-DD') AS dia,
              COALESCE(ROUND(SUM(p.total) * 100), 0)::int            AS total,
              COUNT(*)::int                                          AS pedidos
         FROM pedido p
         JOIN status_pedido sp ON sp.id_status = p.id_status
        WHERE ${CANCELADO}
          AND ($1::timestamp IS NULL OR p.data_hora >= $1::timestamp)
          AND ($2::timestamp IS NULL OR p.data_hora < ($2::timestamp + INTERVAL '1 day'))
        GROUP BY 1
        ORDER BY 1`,
      [de, ate],
    ),

  porFormaPagamento: (de: string | null, ate: string | null) =>
    query<{ metodo: string; total: number; qtd: number }>(
      `SELECT fp.nome                                    AS metodo,
              COALESCE(ROUND(SUM(pg.valor) * 100), 0)::int AS total,
              COUNT(DISTINCT p.id_pedido)::int            AS qtd
         FROM pagamento pg
         JOIN pedido p ON p.id_pedido = pg.id_pedido
         JOIN forma_pagamento fp ON fp.id_forma = pg.id_forma
         JOIN status_pedido sp ON sp.id_status = p.id_status
        WHERE ${CANCELADO}
          AND ($1::timestamp IS NULL OR p.data_hora >= $1::timestamp)
          AND ($2::timestamp IS NULL OR p.data_hora < ($2::timestamp + INTERVAL '1 day'))
        GROUP BY fp.nome
        ORDER BY total DESC`,
      [de, ate],
    ),

  porCanal: (de: string | null, ate: string | null) =>
    query<{ canal: string; total: number; pedidos: number }>(
      `SELECT lower(ca.nome)                              AS canal,
              COALESCE(ROUND(SUM(p.total) * 100), 0)::int  AS total,
              COUNT(*)::int                                AS pedidos
         FROM pedido p
         JOIN canal_origem ca ON ca.id_canal = p.id_canal
         JOIN status_pedido sp ON sp.id_status = p.id_status
        WHERE ${CANCELADO}
          AND ($1::timestamp IS NULL OR p.data_hora >= $1::timestamp)
          AND ($2::timestamp IS NULL OR p.data_hora < ($2::timestamp + INTERVAL '1 day'))
        GROUP BY ca.nome
        ORDER BY total DESC`,
      [de, ate],
    ),

  comprasPorDia: (de: string | null, ate: string | null) =>
    query<{ dia: string; total: number }>(
      `SELECT to_char(comprada_em, 'YYYY-MM-DD')            AS dia,
              COALESCE(SUM(valor_total), 0)::int             AS total
         FROM compra_insumo
        WHERE ($1::date IS NULL OR comprada_em >= $1::date)
          AND ($2::date IS NULL OR comprada_em <= $2::date)
        GROUP BY 1
        ORDER BY 1`,
      [de, ate],
    ),

  topItens: (de: string | null, ate: string | null, limite: number) =>
    query<{ nome: string; qtd: number; total: number }>(
      `SELECT i.nome,
              SUM(i.quantidade)::int                        AS qtd,
              COALESCE(ROUND(SUM(i.preco_unitario * i.quantidade) * 100), 0)::int AS total
         FROM item_pedido i
         JOIN pedido p ON p.id_pedido = i.id_pedido
         JOIN status_pedido sp ON sp.id_status = p.id_status
        WHERE ${CANCELADO}
          AND i.nome IS NOT NULL
          AND ($1::timestamp IS NULL OR p.data_hora >= $1::timestamp)
          AND ($2::timestamp IS NULL OR p.data_hora < ($2::timestamp + INTERVAL '1 day'))
        GROUP BY i.nome
        ORDER BY qtd DESC, total DESC
        LIMIT $3`,
      [de, ate, limite],
    ),
};

export default relatorioRepository;
