import { query, um } from '../../../config/db.js';

export interface ContaLinha {
  id: number;
  nome: string;
  categoria: string;
  valor: number;
  tipo: string;
  intervaloDias: number | null;
  diaVencimento: number | null;
  dataInicio: string;
  dataFim: string | null;
  repeticoes: number | null;
  icone: string;
  ativo: boolean;
  vigente: boolean;
  mensalEquivalente: number;
}

// vigente = a conta ainda cobra hoje: data final no futuro (ou ausente) e repetições
// que ainda não acabaram. Sem isso, "cobra a cada 15 dias, 12 vezes" cobrava para sempre
const VIGENTE = `
  (data_fim IS NULL OR data_fim >= CURRENT_DATE)
  AND (
    repeticoes IS NULL
    OR CASE tipo
         WHEN 'mensal'    THEN (EXTRACT(YEAR FROM AGE(CURRENT_DATE, data_inicio)) * 12
                              + EXTRACT(MONTH FROM AGE(CURRENT_DATE, data_inicio)))::int
         WHEN 'periodico' THEN FLOOR((CURRENT_DATE - data_inicio)::numeric / GREATEST(1, intervalo_dias))::int
         ELSE 0
       END < repeticoes
  )
`;

const SELECT_CONTA = `
  SELECT id_custo                     AS id,
         nome,
         categoria,
         valor,
         tipo,
         intervalo_dias               AS "intervaloDias",
         dia_vencimento               AS "diaVencimento",
         to_char(data_inicio, 'YYYY-MM-DD') AS "dataInicio",
         to_char(data_fim, 'YYYY-MM-DD')    AS "dataFim",
         repeticoes,
         icone,
         ativo,
         ${VIGENTE}                   AS vigente,
         CASE
           WHEN NOT (${VIGENTE}) THEN 0
           WHEN tipo = 'mensal'    THEN valor
           WHEN tipo = 'periodico' THEN ROUND(valor * 30.0 / GREATEST(1, intervalo_dias))::int
           ELSE 0
         END                          AS "mensalEquivalente"
    FROM custo_conta
`;

export const contaRepository = {
  listar: () => query<ContaLinha>(`${SELECT_CONTA} WHERE ativo ORDER BY tipo, nome`),

  porId: (id: number) => um<ContaLinha>(`${SELECT_CONTA} WHERE id_custo = $1`, [id]),

  criar: (dados: {
    nome: string;
    categoria: string;
    valor: number;
    tipo: string;
    intervaloDias: number | null;
    diaVencimento: number | null;
    dataInicio: string | null;
    dataFim: string | null;
    repeticoes: number | null;
    icone: string;
  }) =>
    um<ContaLinha>(
      `INSERT INTO custo_conta
         (nome, categoria, valor, tipo, intervalo_dias, dia_vencimento, data_inicio, data_fim, repeticoes, icone)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::date, CURRENT_DATE), $8, $9, $10)
       RETURNING id_custo AS id`,
      [
        dados.nome,
        dados.categoria,
        dados.valor,
        dados.tipo,
        dados.intervaloDias,
        dados.diaVencimento,
        dados.dataInicio,
        dados.dataFim,
        dados.repeticoes,
        dados.icone,
      ],
    ),

  atualizar: async (
    id: number,
    dados: {
      nome: string;
      categoria: string;
      valor: number;
      tipo: string;
      intervaloDias: number | null;
      diaVencimento: number | null;
      dataInicio: string | null;
      dataFim: string | null;
      repeticoes: number | null;
      icone?: string | null;
    },
  ): Promise<number> => {
    const linhas = await query<{ id: number }>(
      `UPDATE custo_conta
          SET nome = $2,
              categoria = $3,
              valor = $4,
              tipo = $5,
              intervalo_dias = $6,
              dia_vencimento = $7,
              data_inicio = COALESCE($8::date, data_inicio),
              data_fim = $9,
              repeticoes = $10,
              icone = COALESCE($11, icone)
        WHERE id_custo = $1
        RETURNING id_custo AS id`,
      [
        id,
        dados.nome,
        dados.categoria,
        dados.valor,
        dados.tipo,
        dados.intervaloDias,
        dados.diaVencimento,
        dados.dataInicio,
        dados.dataFim,
        dados.repeticoes,
        dados.icone ?? null,
      ],
    );
    return linhas.length;
  },

  desativar: async (id: number): Promise<number> => {
    const linhas = await query<{ id: number }>(
      `UPDATE custo_conta SET ativo = FALSE WHERE id_custo = $1 RETURNING id_custo AS id`,
      [id],
    );
    return linhas.length;
  },

  resumo: () =>
    um<{ total: number; mensal: number; imediato: number }>(
      `SELECT COUNT(*)::int AS total,
              COALESCE(SUM(CASE WHEN ${VIGENTE} THEN
                CASE tipo
                  WHEN 'mensal' THEN valor
                  WHEN 'periodico' THEN ROUND(valor * 30.0 / GREATEST(1, intervalo_dias))::int
                  ELSE 0
                END
              ELSE 0 END), 0)::int AS mensal,
              COALESCE(SUM(CASE WHEN ${VIGENTE} AND tipo = 'imediato' THEN valor ELSE 0 END), 0)::int AS imediato
         FROM custo_conta
        WHERE ativo`,
    ),
};

export default contaRepository;
