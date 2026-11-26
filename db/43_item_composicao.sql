-- cozinha precisa saber o que vai na pizza: sabor de cada parte e os ingredientes.
-- `detalhe` é varchar(160) e só cabia a borda, então composição ganha coluna própria.
ALTER TABLE item_pedido ADD COLUMN IF NOT EXISTS composicao JSONB NOT NULL DEFAULT '[]'::jsonb;

SELECT numero, json_agg(json_build_object('nome', i.nome, 'composicao', i.composicao)) AS itens
  FROM pedido p JOIN item_pedido i ON i.id_pedido = p.id_pedido
 WHERE p.numero = 1045 GROUP BY numero;
