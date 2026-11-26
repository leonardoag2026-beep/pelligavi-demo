import { query, um } from '../../../config/db.js';

export interface CompraLinha {
  id: number;
  ingredienteId: number;
  ingrediente: string;
  slug: string;
  gramas: number;
  valorTotal: number;
  custoKgPago: number;
  custoKgCadastrado: number;
  fornecedor: string | null;
  compradaEm: string;
}

const SELECT_COMPRA = `
  SELECT c.id_compra                                        AS id,
         c.id_ingrediente                                   AS "ingredienteId",
         i.nome                                             AS ingrediente,
         i.slug,
         c.gramas,
         c.valor_total                                      AS "valorTotal",
         ROUND(c.valor_total::numeric / c.gramas * 1000)::int AS "custoKgPago",
         i.custo_kg                                         AS "custoKgCadastrado",
         c.fornecedor,
         to_char(c.comprada_em, 'YYYY-MM-DD')               AS "compradaEm"
    FROM compra_insumo c
    JOIN ingrediente i ON i.id_ingrediente = c.id_ingrediente
`;

export const compraRepository = {
  listar: (limite = 30) =>
    query<CompraLinha>(`${SELECT_COMPRA} ORDER BY c.comprada_em DESC, c.id_compra DESC LIMIT $1`, [limite]),

  porId: (id: number) => um<CompraLinha>(`${SELECT_COMPRA} WHERE c.id_compra = $1`, [id]),

  registrar: (dados: {
    ingredienteId: number;
    gramas: number;
    valorTotal: number;
    fornecedor: string | null;
    compradaEm: string | null;
  }) =>
    um<{ id: number }>(
      `INSERT INTO compra_insumo (id_ingrediente, gramas, valor_total, fornecedor, comprada_em)
       VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE))
       RETURNING id_compra AS id`,
      [dados.ingredienteId, dados.gramas, dados.valorTotal, dados.fornecedor, dados.compradaEm],
    ),

  // busca o ingrediente no próprio SQL do módulo: a regra do Evianto proíbe importar
  // repositório de outro módulo, então quem precisa do dado faz a consulta aqui
  ingredienteParaCompra: (slug: string) =>
    um<{ id: number; nome: string; custo_kg: number }>(
      `SELECT id_ingrediente AS id, nome, custo_kg FROM ingrediente WHERE slug = $1 AND ativo`,
      [slug],
    ),

  atualizarCustoDoIngrediente: async (idIngrediente: number, custoKg: number): Promise<void> => {
    await query(`UPDATE ingrediente SET custo_kg = $2 WHERE id_ingrediente = $1`, [idIngrediente, custoKg]);
  },

  totalDoPeriodo: (dias = 30) =>
    um<{ total: number; compras: number }>(
      `SELECT COALESCE(SUM(valor_total), 0)::int AS total, COUNT(*)::int AS compras
         FROM compra_insumo
        WHERE comprada_em >= CURRENT_DATE - $1::int`,
      [dias],
    ),
};

export default compraRepository;
