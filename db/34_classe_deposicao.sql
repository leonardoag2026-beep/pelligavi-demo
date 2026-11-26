-- classe = COMO o ingrediente cai na pizza (rodela, desfiado, espalhado, fio).
-- a geometria da peça mora em ingrediente_render.params.tipo; aqui só ficam os quatro valores
-- que o motor entende, senão nome de geometria vazava para a deposição
UPDATE ingrediente SET classe = 'desfiado' WHERE classe IN ('fios', 'ralado', 'ralada');
UPDATE ingrediente SET classe = 'espalhado' WHERE classe NOT IN ('rodela', 'desfiado', 'espalhado', 'fio');

ALTER TABLE ingrediente DROP CONSTRAINT IF EXISTS ck_ingrediente_classe;
ALTER TABLE ingrediente
  ADD CONSTRAINT ck_ingrediente_classe
  CHECK (classe IN ('rodela', 'desfiado', 'espalhado', 'fio'));
