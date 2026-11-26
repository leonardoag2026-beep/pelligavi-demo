import { query, um } from '../../../config/db.js';

export interface ReembolsoLinha {
  id: number;
  valor: number;
  motivo: string;
  pedidoRef: string | null;
  criadoEm: string;
}

const SELECT = `
  SELECT id_reembolso                                   AS id,
         valor, motivo,
         pedido_ref                                     AS "pedidoRef",
         to_char(criado_em, 'YYYY-MM-DD"T"HH24:MI:SS')  AS "criadoEm"
    FROM reembolso
`;

export const reembolsoRepository = {
  listar: (de: string | null, ate: string | null) =>
    query<ReembolsoLinha>(
      `${SELECT}
        WHERE ($1::date IS NULL OR criado_em >= $1::date)
          AND ($2::date IS NULL OR criado_em <= $2::date)
        ORDER BY criado_em DESC
        LIMIT 200`,
      [de, ate],
    ),

  criar: async (dados: { valor: number; motivo: string; pedidoRef: string | null }): Promise<ReembolsoLinha> => {
    const linha = await um<ReembolsoLinha>(
      `INSERT INTO reembolso (valor, motivo, pedido_ref)
       VALUES ($1, $2, $3)
       RETURNING id_reembolso AS id, valor, motivo, pedido_ref AS "pedidoRef",
                 to_char(criado_em, 'YYYY-MM-DD"T"HH24:MI:SS') AS "criadoEm"`,
      [dados.valor, dados.motivo, dados.pedidoRef],
    );
    return linha as ReembolsoLinha;
  },

  total: async (de: string | null, ate: string | null): Promise<{ total: number; quantidade: number }> => {
    const linhas = await query<{ total: number; quantidade: number }>(
      `SELECT COALESCE(SUM(valor), 0)::int AS total, COUNT(*)::int AS quantidade
         FROM reembolso
        WHERE ($1::date IS NULL OR criado_em >= $1::date)
          AND ($2::date IS NULL OR criado_em <= $2::date)`,
      [de, ate],
    );
    return linhas[0] ?? { total: 0, quantidade: 0 };
  },
};

export default reembolsoRepository;
