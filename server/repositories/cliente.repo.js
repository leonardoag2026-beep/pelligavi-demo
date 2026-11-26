import { varios, um, transacao } from '../db.js';

const CAMPOS = 'id_cliente, nome, telefone, anonimizado, data_cadastro';

export const listar = (busca = '') =>
  varios(
    `SELECT c.${CAMPOS.replace(/, /g, ', c.')},
            COALESCE(json_agg(e.logradouro || ', ' || e.numero ORDER BY e.id_endereco)
                     FILTER (WHERE e.id_endereco IS NOT NULL), '[]') AS enderecos
       FROM cliente c
       LEFT JOIN endereco e ON e.id_cliente = c.id_cliente
      WHERE ($1 = '' OR c.nome ILIKE '%' || $1 || '%'
             OR regexp_replace(COALESCE(c.telefone, ''), '\D', '', 'g') LIKE '%' || regexp_replace($1, '\D', '', 'g') || '%')
      GROUP BY c.id_cliente
      ORDER BY c.nome`,
    [busca]
  );

export const porId = (id) =>
  um(`SELECT ${CAMPOS} FROM cliente WHERE id_cliente = $1`, [id]);

export const enderecosDe = (id) =>
  varios(
    `SELECT id_endereco, logradouro, numero, complemento, bairro, cidade, cep, referencia, apelido
       FROM endereco WHERE id_cliente = $1 ORDER BY id_endereco`,
    [id]
  );

export const criar = ({ nome, telefone, enderecos = [] }) =>
  transacao(async (cx) => {
    const { rows } = await cx.query(
      `INSERT INTO cliente (nome, telefone) VALUES ($1, $2)
       RETURNING ${CAMPOS}`,
      [nome, telefone || null]
    );
    const cliente = rows[0];
    for (const e of enderecos) {
      await cx.query(
        `INSERT INTO endereco (id_cliente, logradouro, numero, complemento, bairro, cidade, cep, referencia, apelido)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [cliente.id_cliente, e.logradouro, e.numero, e.complemento || null, e.bairro,
         e.cidade, e.cep || null, e.referencia || null, e.apelido || null]
      );
    }
    return cliente;
  });

export const atualizar = (id, { nome, telefone }) =>
  um(
    `UPDATE cliente SET nome = $2, telefone = $3 WHERE id_cliente = $1 RETURNING ${CAMPOS}`,
    [id, nome, telefone || null]
  );

export const anonimizar = (id) =>
  transacao(async (cx) => {
    const { rows } = await cx.query(
      `UPDATE cliente
          SET nome = 'Cliente anonimizado ' || id_cliente,
              telefone = NULL,
              anonimizado = TRUE
        WHERE id_cliente = $1
        RETURNING ${CAMPOS}`,
      [id]
    );
    if (!rows.length) throw new Error('Cliente nao encontrado');
    await cx.query('DELETE FROM endereco WHERE id_cliente = $1', [id]);
    await cx.query(
      `UPDATE pedido
          SET nome_cliente = 'Cliente anonimizado ' || $1,
              entrega_logradouro = NULL, entrega_numero = NULL, entrega_complemento = NULL,
              entrega_bairro = NULL, entrega_cidade = NULL, entrega_referencia = NULL
        WHERE id_cliente = $1`,
      [id]
    );
    return rows[0];
  });
