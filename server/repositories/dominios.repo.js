import { varios, um } from '../db.js';

export const categorias = () =>
  varios('SELECT id_categoria, nome FROM categoria ORDER BY nome');

export const tamanhos = () =>
  varios('SELECT id_tamanho, nome, ordem FROM tamanho ORDER BY ordem');

export const statusPedido = () =>
  varios('SELECT id_status, nome, ordem, encerra_pedido FROM status_pedido ORDER BY ordem');

export const canais = () =>
  varios('SELECT id_canal, nome FROM canal_origem ORDER BY nome');

export const tiposPedido = () =>
  varios('SELECT id_tipo, nome, exige_endereco, taxa_base FROM tipo_pedido ORDER BY id_tipo');

export const formasPagamento = () =>
  varios('SELECT id_forma, nome, aceita_troco FROM forma_pagamento ORDER BY id_forma');

export const regrasDesconto = () =>
  varios('SELECT id_regra, valor_minimo, percentual FROM regra_desconto ORDER BY valor_minimo');

export const criarRegraDesconto = ({ valorMinimo, percentual }) =>
  um(
    `INSERT INTO regra_desconto (valor_minimo, percentual)
     VALUES ($1, $2) RETURNING id_regra, valor_minimo, percentual`,
    [valorMinimo, percentual]
  );

export const atualizarRegraDesconto = (id, { valorMinimo, percentual }) =>
  um(
    `UPDATE regra_desconto SET valor_minimo = $2, percentual = $3
      WHERE id_regra = $1 RETURNING id_regra, valor_minimo, percentual`,
    [id, valorMinimo, percentual]
  );

export const removerRegraDesconto = (id) =>
  um('DELETE FROM regra_desconto WHERE id_regra = $1 RETURNING id_regra', [id]);

export const atualizarTaxaTipo = (id, taxa) =>
  um('UPDATE tipo_pedido SET taxa_base = $2 WHERE id_tipo = $1 RETURNING id_tipo, taxa_base', [id, taxa]);

export const calcularTotais = async (subtotal, idTipo) => {
  const linha = await um(
    `SELECT $1::numeric AS subtotal,
            t.taxa_base    AS taxa_entrega,
            COALESCE((SELECT ROUND($1::numeric * r.percentual / 100.0, 2)
                        FROM regra_desconto r
                       WHERE $1::numeric >= r.valor_minimo
                       ORDER BY r.valor_minimo DESC
                       LIMIT 1), 0) AS desconto
       FROM tipo_pedido t
      WHERE t.id_tipo = $2`,
    [subtotal, idTipo]
  );
  if (!linha) throw new Error('Tipo de pedido inexistente');
  return {
    subtotal: Number(linha.subtotal),
    taxa: Number(linha.taxa_entrega),
    desconto: Number(linha.desconto),
    total: Number(linha.subtotal) + Number(linha.taxa_entrega) - Number(linha.desconto),
  };
};
