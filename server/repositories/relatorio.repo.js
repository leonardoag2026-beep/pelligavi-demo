import { varios, um } from '../db.js';

const filtro = `
  WHERE p.data_hora >= $1 AND p.data_hora <= $2
    AND s.nome <> 'Cancelado'`;

export const vendasPorDia = (de, ate) =>
  varios(
    `SELECT DATE(p.data_hora) AS dia, COUNT(*) AS pedidos, SUM(p.total) AS total
       FROM pedido p JOIN status_pedido s ON s.id_status = p.id_status
       ${filtro}
      GROUP BY DATE(p.data_hora) ORDER BY dia`,
    [de, ate]
  );

export const vendasPorCanal = (de, ate) =>
  varios(
    `SELECT c.nome AS canal, COUNT(*) AS pedidos, SUM(p.total) AS total
       FROM pedido p
       JOIN status_pedido s ON s.id_status = p.id_status
       JOIN canal_origem c ON c.id_canal = p.id_canal
       ${filtro}
      GROUP BY c.nome ORDER BY total DESC`,
    [de, ate]
  );

export const itensMaisVendidos = (de, ate, limite = 8) =>
  varios(
    `SELECT pr.nome AS produto, SUM(i.quantidade) AS quantidade, SUM(i.quantidade * i.preco_unitario) AS total
       FROM item_pedido i
       JOIN item_pedido_produto ip ON ip.id_item_pedido = i.id_item_pedido
       JOIN produto pr ON pr.id_produto = ip.id_produto
       JOIN pedido p ON p.id_pedido = i.id_pedido
       JOIN status_pedido s ON s.id_status = p.id_status
       ${filtro}
      GROUP BY pr.nome ORDER BY quantidade DESC LIMIT $3`,
    [de, ate, limite]
  );

export const tempoMedioPreparo = (de, ate) =>
  um(
    `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (pronto.data_hora - p.data_hora)) / 60.0), 1) AS minutos
       FROM pedido p
       JOIN status_pedido s ON s.id_status = p.id_status
       JOIN historico_status pronto
         ON pronto.id_pedido = p.id_pedido
        AND pronto.id_status = (SELECT id_status FROM status_pedido WHERE nome = 'Pronto')
      ${filtro}`,
    [de, ate]
  );

export const resumo = (de, ate) =>
  um(
    `SELECT COUNT(*) AS pedidos, COALESCE(SUM(p.total),0) AS total,
            COALESCE(ROUND(AVG(p.total),2),0) AS ticket
       FROM pedido p JOIN status_pedido s ON s.id_status = p.id_status
       ${filtro}`,
    [de, ate]
  );
