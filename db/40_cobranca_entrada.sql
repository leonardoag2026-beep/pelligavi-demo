-- a cobrança também nasce de itens estruturados: guarda a entrada (o que o cliente
-- pediu) para o pedido nascido dela recalcular o preço no servidor
ALTER TABLE cobranca ADD COLUMN IF NOT EXISTS entrada JSONB NOT NULL DEFAULT '[]'::jsonb;

SELECT codigo, valor, jsonb_array_length(itens) AS itens
  FROM cobranca ORDER BY criada_em DESC LIMIT 3;
