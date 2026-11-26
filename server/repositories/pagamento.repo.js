import { varios, um } from '../db.js';

export const doPedido = (id) =>
  varios(
    `SELECT pg.id_pagamento, f.nome AS forma, pg.valor, pg.data_hora, pg.troco_para
       FROM pagamento pg JOIN forma_pagamento f ON f.id_forma = pg.id_forma
      WHERE pg.id_pedido = $1 ORDER BY pg.id_pagamento`,
    [id]
  );

export const registrar = ({ idPedido, idForma, valor, trocoPara }) =>
  um(
    `INSERT INTO pagamento (id_pedido, id_forma, valor, troco_para)
     VALUES ($1,$2,$3,$4) RETURNING id_pagamento, valor`,
    [idPedido, idForma, valor, trocoPara || null]
  );

export const totalPago = async (idPedido) =>
  Number((await um('SELECT COALESCE(SUM(valor),0) AS pago FROM pagamento WHERE id_pedido = $1', [idPedido])).pago);

export const pedidoQuitado = async (idPedido) => {
  const linha = await um(
    `SELECT p.total, COALESCE(SUM(pg.valor),0) AS pago
       FROM pedido p LEFT JOIN pagamento pg ON pg.id_pedido = p.id_pedido
      WHERE p.id_pedido = $1 GROUP BY p.total`,
    [idPedido]
  );
  return Boolean(linha) && Number(linha.pago) >= Number(linha.total);
};

export const porForma = ({ de, ate } = {}) =>
  varios(
    `SELECT f.nome AS forma, COUNT(*) AS quantidade, SUM(pg.valor) AS total
       FROM pagamento pg
       JOIN forma_pagamento f ON f.id_forma = pg.id_forma
       JOIN pedido p ON p.id_pedido = pg.id_pedido
      WHERE ($1::timestamp IS NULL OR p.data_hora >= $1)
        AND ($2::timestamp IS NULL OR p.data_hora <= $2)
      GROUP BY f.nome ORDER BY total DESC`,
    [de || null, ate || null]
  );
