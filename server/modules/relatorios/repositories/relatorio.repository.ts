import { query, um } from '../../../config/db.js';

export interface ResumoLinha {
  pedidos: number;
  total: number;
  ticket: number;
  tempoMedio: number | null;
}

// Os relatórios leem as views do banco (db/03_objetos.sql): a agregação e o filtro
// de pedido cancelado ficam numa definição só, e o Node não repete a regra.
const PERIODO = `
  ($1::date IS NULL OR dia >= $1::date)
  AND ($2::date IS NULL OR dia <= $2::date)`;

export const relatorioRepository = {
  resumo: async (de: string | null, ate: string | null): Promise<ResumoLinha | null> => {
    const vendas = await um<{ pedidos: number; total: number }>(
      `SELECT COALESCE(SUM(qtd_pedidos), 0)::int                 AS pedidos,
              COALESCE(ROUND(SUM(total_vendido) * 100), 0)::int   AS total
         FROM vw_vendas_por_dia
        WHERE ${PERIODO}`,
      [de, ate],
    );

    const preparo = await um<{ segundos: number | null }>(
      `SELECT CASE WHEN SUM(qtd_pedidos) = 0 THEN NULL
                   ELSE (SUM(tempo_medio_minutos * qtd_pedidos) / SUM(qtd_pedidos)) * 60
              END::int AS segundos
         FROM vw_tempo_medio_preparo
        WHERE ${PERIODO}`,
      [de, ate],
    );

    const pedidos = vendas?.pedidos ?? 0;
    const total = vendas?.total ?? 0;

    return {
      pedidos,
      total,
      ticket: pedidos > 0 ? Math.round(total / pedidos) : 0,
      tempoMedio: preparo?.segundos ?? null,
    };
  },

  vendasPorDia: (de: string | null, ate: string | null) =>
    query<{ dia: string; total: number; pedidos: number }>(
      `SELECT to_char(dia, 'YYYY-MM-DD')                 AS dia,
              COALESCE(ROUND(total_vendido * 100), 0)::int AS total,
              qtd_pedidos::int                             AS pedidos
         FROM vw_vendas_por_dia
        WHERE ${PERIODO}
        ORDER BY dia`,
      [de, ate],
    ),

  porFormaPagamento: (de: string | null, ate: string | null) =>
    query<{ metodo: string; total: number; qtd: number }>(
      `SELECT forma_pagamento                             AS metodo,
              COALESCE(ROUND(SUM(total_recebido) * 100), 0)::int AS total,
              SUM(qtd_pagamentos)::int                    AS qtd
         FROM vw_vendas_por_forma_pagamento
        WHERE ${PERIODO}
        GROUP BY forma_pagamento
        ORDER BY total DESC`,
      [de, ate],
    ),

  porCanal: (de: string | null, ate: string | null) =>
    query<{ canal: string; total: number; pedidos: number }>(
      `SELECT lower(canal)                                AS canal,
              COALESCE(ROUND(SUM(total_vendido) * 100), 0)::int AS total,
              SUM(qtd_pedidos)::int                       AS pedidos
         FROM vw_vendas_por_canal
        WHERE ${PERIODO}
        GROUP BY canal
        ORDER BY total DESC`,
      [de, ate],
    ),

  comprasPorDia: (de: string | null, ate: string | null) =>
    query<{ dia: string; total: number }>(
      `SELECT to_char(comprada_em, 'YYYY-MM-DD') AS dia,
              COALESCE(SUM(valor_total), 0)::int AS total
         FROM compra_insumo
        WHERE ($1::date IS NULL OR comprada_em >= $1::date)
          AND ($2::date IS NULL OR comprada_em <= $2::date)
        GROUP BY 1
        ORDER BY 1`,
      [de, ate],
    ),

  topItens: (de: string | null, ate: string | null, limite: number) =>
    query<{ nome: string; qtd: number; total: number }>(
      `SELECT produto                              AS nome,
              SUM(quantidade_vendida)::int        AS qtd,
              COALESCE(ROUND(SUM(valor_vendido) * 100), 0)::int AS total
         FROM vw_itens_mais_vendidos
        WHERE ${PERIODO}
        GROUP BY produto
        ORDER BY qtd DESC, total DESC
        LIMIT $3`,
      [de, ate, limite],
    ),
};

export default relatorioRepository;
