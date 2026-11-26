import { varios, um, transacao } from '../db.js';

export const listar = ({ categoria, somenteAtivos = false } = {}) =>
  varios(
    `SELECT p.id_produto, p.nome, p.descricao, p.ativo, p.disponivel,
            c.nome AS categoria,
            COALESCE(json_object_agg(t.nome, pp.valor) FILTER (WHERE t.id_tamanho IS NOT NULL), '{}') AS precos
       FROM produto p
       JOIN categoria c ON c.id_categoria = p.id_categoria
       LEFT JOIN preco_produto pp ON pp.id_produto = p.id_produto
       LEFT JOIN tamanho t ON t.id_tamanho = pp.id_tamanho
      WHERE ($1::text IS NULL OR c.nome = $1)
        AND (NOT $2 OR (p.ativo AND p.disponivel))
      GROUP BY p.id_produto, c.nome
      ORDER BY c.nome, p.nome`,
    [categoria || null, somenteAtivos]
  );

export const porId = (id) =>
  um(
    `SELECT p.id_produto, p.nome, p.descricao, p.ativo, p.disponivel, p.id_categoria
       FROM produto p WHERE p.id_produto = $1`,
    [id]
  );

export const preco = (idProduto, idTamanho) =>
  um(
    'SELECT valor FROM preco_produto WHERE id_produto = $1 AND id_tamanho = $2',
    [idProduto, idTamanho]
  );

export const criar = ({ idCategoria, nome, descricao, precos = {} }) =>
  transacao(async (cx) => {
    const { rows } = await cx.query(
      `INSERT INTO produto (id_categoria, nome, descricao) VALUES ($1, $2, $3)
       RETURNING id_produto, nome, descricao, ativo, disponivel`,
      [idCategoria, nome, descricao || null]
    );
    const produto = rows[0];
    for (const [idTamanho, valor] of Object.entries(precos)) {
      await cx.query(
        'INSERT INTO preco_produto (id_produto, id_tamanho, valor) VALUES ($1, $2, $3)',
        [produto.id_produto, idTamanho, valor]
      );
    }
    return produto;
  });

export const atualizarPreco = (idProduto, idTamanho, valor) =>
  um(
    `INSERT INTO preco_produto (id_produto, id_tamanho, valor) VALUES ($1, $2, $3)
     ON CONFLICT (id_produto, id_tamanho) DO UPDATE SET valor = EXCLUDED.valor
     RETURNING id_produto, id_tamanho, valor`,
    [idProduto, idTamanho, valor]
  );

export const definirAtivo = (id, ativo) =>
  um('UPDATE produto SET ativo = $2 WHERE id_produto = $1 RETURNING id_produto, ativo', [id, ativo]);

export const definirDisponivel = (id, disponivel) =>
  um('UPDATE produto SET disponivel = $2 WHERE id_produto = $1 RETURNING id_produto, disponivel', [id, disponivel]);
