import { varios, um } from '../db.js';

export const aberto = () =>
  um(
    `SELECT id_caixa, aberto_em, valor_inicial FROM caixa
      WHERE fechado_em IS NULL ORDER BY aberto_em DESC LIMIT 1`
  );

export const abrir = (valorInicial) =>
  um(
    'INSERT INTO caixa (valor_inicial) VALUES ($1) RETURNING id_caixa, aberto_em, valor_inicial',
    [valorInicial]
  );

export const porFormaDesde = (desde) =>
  varios(
    `SELECT f.nome AS forma, SUM(pg.valor) AS total, COUNT(*) AS quantidade
       FROM pagamento pg
       JOIN forma_pagamento f ON f.id_forma = pg.id_forma
       JOIN pedido p ON p.id_pedido = pg.id_pedido
       JOIN status_pedido s ON s.id_status = p.id_status
      WHERE p.data_hora >= $1 AND s.nome <> 'Cancelado'
      GROUP BY f.nome ORDER BY total DESC`,
    [desde]
  );

export const fechar = (id, { valorEsperado, valorContado }) =>
  um(
    `UPDATE caixa
        SET fechado_em = NOW(), valor_esperado = $2, valor_contado = $3
      WHERE id_caixa = $1 AND fechado_em IS NULL
      RETURNING id_caixa, aberto_em, fechado_em, valor_inicial, valor_esperado, valor_contado,
                (valor_contado - valor_esperado - valor_inicial) AS diferenca`,
    [id, valorEsperado, valorContado]
  );

export const historico = () =>
  varios(
    `SELECT id_caixa, aberto_em, fechado_em, valor_inicial, valor_esperado, valor_contado
       FROM caixa ORDER BY aberto_em DESC LIMIT 20`
  );
