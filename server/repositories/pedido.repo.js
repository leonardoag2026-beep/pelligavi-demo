import { varios, um, transacao } from '../db.js';

const BASE = `
  SELECT p.id_pedido, p.data_hora, p.nome_cliente, p.subtotal, p.taxa_entrega,
         p.desconto, p.total, p.motivo_cancelamento,
         p.id_cliente, p.id_status, p.id_canal, p.id_tipo,
         s.nome AS status, s.ordem AS status_ordem, s.encerra_pedido,
         c.nome AS canal, t.nome AS tipo
    FROM pedido p
    JOIN status_pedido s ON s.id_status = p.id_status
    JOIN canal_origem  c ON c.id_canal  = p.id_canal
    JOIN tipo_pedido   t ON t.id_tipo   = p.id_tipo`;

export const listar = ({ de, ate, idCliente, status, canal, nomeCliente } = {}) =>
  varios(
    `${BASE}
      WHERE ($1::timestamp IS NULL OR p.data_hora >= $1)
        AND ($2::timestamp IS NULL OR p.data_hora <= $2)
        AND ($3::int IS NULL OR p.id_cliente = $3)
        AND ($4::text IS NULL OR s.nome = $4)
        AND ($5::text IS NULL OR c.nome = $5)
        AND ($6::text IS NULL OR p.nome_cliente ILIKE '%' || $6 || '%')
      ORDER BY p.data_hora DESC`,
    [de || null, ate || null, idCliente || null, status || null, canal || null, nomeCliente || null]
  );

export const emAberto = () =>
  varios(
    `${BASE}
      WHERE NOT s.encerra_pedido
      ORDER BY s.ordem, p.data_hora`,
    []
  );

export const porId = (id) => um(`${BASE} WHERE p.id_pedido = $1`, [id]);

export const itens = (id) =>
  varios(
    `SELECT i.id_item_pedido, i.quantidade, i.preco_unitario, i.observacao,
            t.nome AS tamanho,
            COALESCE(json_agg(pr.nome ORDER BY pr.nome) FILTER (WHERE pr.id_produto IS NOT NULL), '[]') AS produtos
       FROM item_pedido i
       JOIN tamanho t ON t.id_tamanho = i.id_tamanho
       LEFT JOIN item_pedido_produto ip ON ip.id_item_pedido = i.id_item_pedido
       LEFT JOIN produto pr ON pr.id_produto = ip.id_produto
      WHERE i.id_pedido = $1
      GROUP BY i.id_item_pedido, t.nome
      ORDER BY i.id_item_pedido`,
    [id]
  );

export const historico = (id) =>
  varios(
    `SELECT h.id_historico, h.data_hora, s.nome AS status, s.ordem
       FROM historico_status h
       JOIN status_pedido s ON s.id_status = h.id_status
      WHERE h.id_pedido = $1
      ORDER BY h.data_hora, h.id_historico`,
    [id]
  );

export const pagamentos = (id) =>
  varios(
    `SELECT pg.id_pagamento, f.nome AS forma, pg.valor, pg.data_hora, pg.troco_para
       FROM pagamento pg
       JOIN forma_pagamento f ON f.id_forma = pg.id_forma
      WHERE pg.id_pedido = $1
      ORDER BY pg.id_pagamento`,
    [id]
  );

export const criar = ({ idCliente, idStatus, idCanal, idTipo, nomeCliente, entrega, subtotal, taxa, desconto, total, itens = [], pagamentos = [] }) =>
  transacao(async (cx) => {
    const { rows } = await cx.query(
      `INSERT INTO pedido (
         id_cliente, id_status, id_canal, id_tipo, nome_cliente,
         entrega_logradouro, entrega_numero, entrega_complemento, entrega_bairro, entrega_cidade, entrega_referencia,
         subtotal, taxa_entrega, desconto, total
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id_pedido, data_hora, total`,
      [idCliente || null, idStatus, idCanal, idTipo, nomeCliente,
       entrega?.logradouro || null, entrega?.numero || null, entrega?.complemento || null,
       entrega?.bairro || null, entrega?.cidade || null, entrega?.referencia || null,
       subtotal, taxa, desconto, total]
    );
    const pedido = rows[0];

    for (const item of itens) {
      const r = await cx.query(
        `INSERT INTO item_pedido (id_pedido, id_tamanho, quantidade, preco_unitario, observacao)
         VALUES ($1,$2,$3,$4,$5) RETURNING id_item_pedido`,
        [pedido.id_pedido, item.idTamanho, item.quantidade, item.precoUnitario, item.observacao || null]
      );
      for (const idProduto of item.produtos || []) {
        await cx.query(
          'INSERT INTO item_pedido_produto (id_item_pedido, id_produto) VALUES ($1,$2)',
          [r.rows[0].id_item_pedido, idProduto]
        );
      }
    }

    for (const pg of pagamentos) {
      await cx.query(
        'INSERT INTO pagamento (id_pedido, id_forma, valor, troco_para) VALUES ($1,$2,$3,$4)',
        [pedido.id_pedido, pg.idForma, pg.valor, pg.trocoPara || null]
      );
    }

    await cx.query(
      'INSERT INTO historico_status (id_pedido, id_status) VALUES ($1,$2)',
      [pedido.id_pedido, idStatus]
    );

    return pedido;
  });

export const mudarStatus = (id, idStatus, motivo = null) =>
  transacao(async (cx) => {
    const { rows } = await cx.query(
      `UPDATE pedido
          SET id_status = $2,
              motivo_cancelamento = COALESCE($3, motivo_cancelamento)
        WHERE id_pedido = $1
        RETURNING id_pedido, id_status`,
      [id, idStatus, motivo]
    );
    if (!rows.length) throw new Error('Pedido nao encontrado');
    await cx.query(
      'INSERT INTO historico_status (id_pedido, id_status) VALUES ($1,$2)',
      [id, idStatus]
    );
    return rows[0];
  });

export const atualizarTotais = (id, { subtotal, taxa, desconto, total }) =>
  um(
    `UPDATE pedido SET subtotal = $2, taxa_entrega = $3, desconto = $4, total = $5
      WHERE id_pedido = $1 RETURNING id_pedido, subtotal, taxa_entrega, desconto, total`,
    [id, subtotal, taxa, desconto, total]
  );

export const cancelar = (id, motivo) =>
  transacao(async (cx) => {
    const { rows } = await cx.query(
      `UPDATE pedido p
          SET id_status = (SELECT id_status FROM status_pedido WHERE nome = 'Cancelado'),
              motivo_cancelamento = $2
        WHERE p.id_pedido = $1
        RETURNING id_pedido, id_status, motivo_cancelamento`,
      [id, motivo]
    );
    if (!rows.length) throw new Error('Pedido nao encontrado');
    await cx.query(
      `INSERT INTO historico_status (id_pedido, id_status)
       SELECT $1, id_status FROM status_pedido WHERE nome = 'Cancelado'`,
      [id]
    );
    return rows[0];
  });
