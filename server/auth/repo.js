import { pool, um, varios, transacao } from '../db.js';

export const porIdentificador = (identificador) => um(
  `SELECT id_conta, nome, email, celular, senha_hash, id_cliente, ultimo_login
     FROM conta
    WHERE (email IS NOT NULL AND lower(email) = lower($1))
       OR (celular IS NOT NULL AND $1 ~ '\\d' AND regexp_replace(celular, '\\D', '', 'g') = regexp_replace($1, '\\D', '', 'g'))
    LIMIT 1`,
  [identificador],
);

export const porId = (id) => um(
  'SELECT id_conta, nome, email, celular, id_cliente, criado_em, ultimo_login FROM conta WHERE id_conta = $1',
  [id],
);

export const criar = ({ nome, email, celular, senhaHash }) => transacao(async (cli) => {
  const { rows: [cliente] } = await cli.query(
    'INSERT INTO cliente (nome, telefone) VALUES ($1, $2) RETURNING id_cliente',
    [nome, celular || null],
  );
  const { rows: [conta] } = await cli.query(
    `INSERT INTO conta (nome, email, celular, senha_hash, id_cliente)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_conta, nome, email, celular, id_cliente`,
    [nome, email || null, celular || null, senhaHash, cliente.id_cliente],
  );
  return conta;
});

export const abrirSessao = async ({ idConta, horas, userAgent }) => {
  const { rows: [sessao] } = await pool.query(
    `INSERT INTO sessao (id_conta, expira_em, user_agent)
     VALUES ($1, now() + make_interval(hours => $2), $3)
     RETURNING id_sessao, expira_em`,
    [idConta, horas, (userAgent || '').slice(0, 250) || null],
  );
  return sessao;
};

export const sessaoAtiva = (idSessao) => um(
  `SELECT id_sessao, id_conta FROM sessao
    WHERE id_sessao = $1 AND revogada_em IS NULL AND expira_em > now()`,
  [idSessao],
);

export const revogar = (idSessao) => pool.query(
  'UPDATE sessao SET revogada_em = now() WHERE id_sessao = $1 AND revogada_em IS NULL',
  [idSessao],
);

export const tocarLogin = (idConta) => pool.query('UPDATE conta SET ultimo_login = now() WHERE id_conta = $1', [idConta]);

export const pedidosDaConta = (idConta) => varios(
  `SELECT p.id_pedido                       AS numero,
          p.data_hora                        AS criado_em,
          s.nome                             AS status,
          t.nome                             AS tipo,
          p.nome_cliente                     AS cliente,
          p.entrega_logradouro               AS logradouro,
          p.entrega_numero                   AS numero_endereco,
          p.entrega_bairro                   AS bairro,
          p.subtotal * 100                   AS subtotal,
          p.taxa_entrega * 100               AS taxa,
          p.desconto * 100                   AS desconto,
          p.total * 100                      AS total,
          COALESCE(
            json_agg(json_build_object(
              'nome', prod.nome,
              'qtd', i.quantidade,
              'preco', i.preco_unitario * 100
            ) ORDER BY i.id_item_pedido) FILTER (WHERE i.id_item_pedido IS NOT NULL),
            '[]'
          )                                  AS itens
     FROM pedido p
     JOIN status_pedido s ON s.id_status = p.id_status
     JOIN tipo_pedido   t ON t.id_tipo   = p.id_tipo
     LEFT JOIN item_pedido        i   ON i.id_pedido   = p.id_pedido
     LEFT JOIN item_pedido_produto ip ON ip.id_item_pedido = i.id_item_pedido
     LEFT JOIN produto            prod ON prod.id_produto = ip.id_produto
    WHERE p.id_cliente = $1
    GROUP BY p.id_pedido, s.nome, t.nome
    ORDER BY p.data_hora DESC`,
  [idConta],
);
