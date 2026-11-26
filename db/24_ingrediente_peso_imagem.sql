ALTER TABLE ingrediente ADD COLUMN IF NOT EXISTS imagem    varchar(255);
ALTER TABLE ingrediente ADD COLUMN IF NOT EXISTS preco_kg  integer;

UPDATE ingrediente
   SET preco_kg = ROUND(preco_porcao::numeric * 1000 / gramas_porcao)
 WHERE preco_kg IS NULL;

ALTER TABLE ingrediente
  ADD CONSTRAINT ck_ingrediente_preco_kg CHECK (preco_kg IS NULL OR preco_kg >= 0);
