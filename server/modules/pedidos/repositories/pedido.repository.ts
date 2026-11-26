import { query, transacao, um } from '../../../config/db.js';

export interface ItemEntrada {
  nome: string;
  detalhe: string | null;
  composicao?: string[];
  qtd: number;
  preco: number;
  tipo: string | null;
}

export interface PedidoEntrada {
  canal: string;
  tipo: string;
  nomeCliente: string;
  telefone: string | null;
  endereco: string | null;
  observacao: string | null;
  subtotal: number;
  taxa: number;
  desconto: number;
  total: number;
  status: string;
  dispositivo: string | null;
  contaRef: string | null;
  itens: ItemEntrada[];
  formaPagamento: string | null;
  statusPagamento: string;
}

export interface RegraDeCobranca {
  taxaBase: number;
  freteGratisAcima: number;
  faixas: { minimo: number; percentual: number }[];
}

export interface PedidoLinha {
  id: number;
  numero: number;
  canal: string;
  tipo: string;
  status: string;
  nomeCliente: string;
  telefone: string | null;
  endereco: string | null;
  observacao: string | null;
  subtotal: number;
  taxa: number;
  desconto: number;
  total: number;
  dispositivo: string | null;
  contaRef: string | null;
  criadoEm: string;
  itens: { nome: string; detalhe: string | null; qtd: number; preco: number; tipo: string | null; composicao?: string[] }[];
  pagamentos: { metodo: string; valor: number; status: string; em: string }[];
  historico: { status: string; em: string; motivo: string | null }[];
}

const SELECT_PEDIDO = `
  SELECT p.id_pedido                                AS id,
         p.numero,
         ca.nome                                    AS canal,
         tp.nome                                    AS tipo,
         sp.nome                                    AS status,
         p.nome_cliente                             AS "nomeCliente",
         p.telefone,
         p.entrega_logradouro                       AS endereco,
         p.observacao,
         ROUND(p.subtotal * 100)::int               AS subtotal,
         ROUND(p.taxa_entrega * 100)::int           AS taxa,
         ROUND(p.desconto * 100)::int               AS desconto,
         ROUND(p.total * 100)::int                  AS total,
         p.dispositivo,
         p.conta_ref                                AS "contaRef",
         to_char(p.data_hora, 'YYYY-MM-DD"T"HH24:MI:SS') AS "criadoEm",
         COALESCE((
           SELECT json_agg(json_build_object(
                    'nome', i.nome, 'detalhe', i.detalhe, 'qtd', i.quantidade,
                    'preco', ROUND(i.preco_unitario * 100)::int, 'tipo', i.tipo,
                    'composicao', COALESCE(i.composicao, '[]'::jsonb)
                  ) ORDER BY i.id_item_pedido)
             FROM item_pedido i WHERE i.id_pedido = p.id_pedido
         ), '[]'::json)                             AS itens,
         COALESCE((
           SELECT json_agg(json_build_object(
                    'metodo', fp.nome, 'valor', ROUND(pg.valor * 100)::int, 'status', pg.status,
                    'em', to_char(pg.data_hora, 'YYYY-MM-DD"T"HH24:MI:SS')
                  ) ORDER BY pg.id_pagamento)
             FROM pagamento pg JOIN forma_pagamento fp ON fp.id_forma = pg.id_forma
            WHERE pg.id_pedido = p.id_pedido
         ), '[]'::json)                             AS pagamentos,
         COALESCE((
           SELECT json_agg(json_build_object(
                    'status', sp2.nome, 'em', to_char(h.data_hora, 'YYYY-MM-DD"T"HH24:MI:SS'),
                    'motivo', h.motivo
                  ) ORDER BY h.id_historico)
             FROM historico_status h JOIN status_pedido sp2 ON sp2.id_status = h.id_status
            WHERE h.id_pedido = p.id_pedido
         ), '[]'::json)                             AS historico
    FROM pedido p
    JOIN canal_origem  ca ON ca.id_canal  = p.id_canal
    JOIN tipo_pedido   tp ON tp.id_tipo   = p.id_tipo
    JOIN status_pedido sp ON sp.id_status = p.id_status
`;

export const pedidoRepository = {
  listar: (filtro: { dispositivo?: string | null; contaRef?: string | null; limite?: number } = {}) =>
    query<PedidoLinha>(
      `${SELECT_PEDIDO}
        WHERE ($1::text IS NULL OR p.dispositivo = $1)
          AND ($2::text IS NULL OR p.conta_ref = $2)
        ORDER BY p.data_hora DESC, p.id_pedido DESC
        LIMIT $3`,
      [filtro.dispositivo ?? null, filtro.contaRef ?? null, filtro.limite ?? 100],
    ),

  porNumero: (numero: number) => um<PedidoLinha>(`${SELECT_PEDIDO} WHERE p.numero = $1`, [numero]),

  criar: async (dados: PedidoEntrada): Promise<PedidoLinha> => {
    const numero = await transacao(async (cliente) => {
      await cliente.query('SELECT pg_advisory_xact_lock(918273)');

      const { rows } = await cliente.query<{ numero: number; id: number }>(
        `WITH proximo AS (SELECT COALESCE(MAX(numero), 1040) + 1 AS n FROM pedido)
         INSERT INTO pedido (
           numero, id_status, id_canal, id_tipo, nome_cliente, telefone,
           entrega_logradouro, subtotal, taxa_entrega, desconto, total,
           observacao, dispositivo, conta_ref
         )
         SELECT proximo.n,
                (SELECT id_status FROM status_pedido WHERE nome = $1),
                (SELECT id_canal  FROM canal_origem  WHERE nome = $2),
                (SELECT id_tipo   FROM tipo_pedido   WHERE nome = $3),
                $4, $5, $6, $7::numeric / 100, $8::numeric / 100, $9::numeric / 100, $10::numeric / 100,
                $11, $12, $13
           FROM proximo
         RETURNING id_pedido AS id, numero`,
        [
          dados.status, dados.canal, dados.tipo, dados.nomeCliente, dados.telefone,
          dados.endereco, dados.subtotal, dados.taxa, dados.desconto, dados.total,
          dados.observacao, dados.dispositivo, dados.contaRef,
        ],
      );
      const pedido = rows[0]!;

      for (const item of dados.itens) {
        await cliente.query(
          `INSERT INTO item_pedido (id_pedido, id_tamanho, quantidade, preco_unitario, nome, detalhe, tipo, composicao)
           VALUES ($1, (SELECT id_tamanho FROM tamanho WHERE nome = 'Unico'), $2, $3::numeric / 100, $4, $5, $6, $7::jsonb)`,
          [pedido.id, item.qtd, item.preco, item.nome, item.detalhe, item.tipo, JSON.stringify(item.composicao ?? [])],
        );
      }

      if (dados.formaPagamento && dados.total > 0) {
        await cliente.query(
          `INSERT INTO pagamento (id_pedido, id_forma, valor, status)
           VALUES ($1, (SELECT id_forma FROM forma_pagamento WHERE nome = $2), $3::numeric / 100, $4)`,
          [pedido.id, dados.formaPagamento, dados.total, dados.statusPagamento],
        );
      }

      await cliente.query(
        `INSERT INTO historico_status (id_pedido, id_status)
         SELECT $1, id_status FROM status_pedido WHERE nome = $2`,
        [pedido.id, dados.status],
      );

      return pedido.numero;
    });

    const criado = await pedidoRepository.porNumero(numero);
    if (!criado) throw new Error('Pedido criado não encontrado');
    return criado;
  },

  mudarStatus: async (numero: number, status: string, motivo: string | null): Promise<PedidoLinha | null> => {
    await transacao(async (cliente) => {
      const { rows } = await cliente.query<{ id: number }>(
        `UPDATE pedido
            SET id_status = (SELECT id_status FROM status_pedido WHERE nome = $2)
          WHERE numero = $1
        RETURNING id_pedido AS id`,
        [numero, status],
      );
      const pedido = rows[0];
      if (!pedido) return;
      await cliente.query(
        `INSERT INTO historico_status (id_pedido, id_status, motivo)
         SELECT $1, id_status, $3 FROM status_pedido WHERE nome = $2`,
        [pedido.id, status, motivo],
      );
    });
    return pedidoRepository.porNumero(numero);
  },

  // o servidor recalcula taxa e desconto: o cliente manda o pedido, não o preço
  regraDeCobranca: async (): Promise<RegraDeCobranca> => {
    const config = await um<{ taxaBase: number; freteGratisAcima: number }>(
      `SELECT taxa_base AS "taxaBase", frete_gratis_acima AS "freteGratisAcima"
         FROM loja_config WHERE id_config = 1`,
    );
    const faixas = await query<{ minimo: number; percentual: number }>(
      // valor_minimo é gravado em reais (80.00); a API trabalha em centavos
      `SELECT ROUND(valor_minimo * 100)::int AS minimo, percentual::float8 AS percentual
         FROM regra_desconto ORDER BY valor_minimo DESC`,
    );
    return {
      taxaBase: config?.taxaBase ?? 0,
      freteGratisAcima: config?.freteGratisAcima ?? 0,
      faixas,
    };
  },
};

export default pedidoRepository;
