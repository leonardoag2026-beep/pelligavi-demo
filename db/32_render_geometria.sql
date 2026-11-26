-- 32: libera as classes 'fios' e 'rasgada' em ingrediente_render.geometria
-- (o banco já usa essas classes em ingrediente.classe; o CHECK ficou para trás)

ALTER TABLE ingrediente_render
  DROP CONSTRAINT IF EXISTS ck_render_geometria;

ALTER TABLE ingrediente_render
  ADD CONSTRAINT ck_render_geometria CHECK (
    geometria IN ('auto', 'fio', 'fios', 'rodela', 'desfiado', 'espalhado', 'rasgada', 'cubo', 'stl')
  );

-- contrato de params (JSONB) usado pelo motor 3D:
--   escala       multiplicador de tamanho da peça (1 = padrão)
--   variacao     variação aleatória de tamanho por peça (0 = nenhuma)
--   porcao       peças por porção (densidade do emissor)
--   altura       altura de queda em metros
--   rugosidade   roughness do material (0–1)
--   metalico     metalness do material (0–1)
--   repeticao    repetições da textura no UV (fios usam 24)
