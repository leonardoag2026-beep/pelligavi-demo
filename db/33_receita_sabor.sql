-- receita do sabor: ordem própria e porções por ingrediente
-- a ordem antiga vinha de ingrediente.ordem, o que impedia montar receitas fora da ordem global
ALTER TABLE sabor_ingrediente ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sabor_ingrediente ADD COLUMN IF NOT EXISTS porcoes INTEGER NOT NULL DEFAULT 1;

UPDATE sabor_ingrediente si
   SET ordem = i.ordem
  FROM ingrediente i
 WHERE i.id_ingrediente = si.id_ingrediente
   AND si.ordem = 0;

CREATE INDEX IF NOT EXISTS ix_sabor_ingrediente_ordem ON sabor_ingrediente (id_produto, ordem);
