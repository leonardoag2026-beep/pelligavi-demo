-- o desfiado estava virando tapete: 150 fios por peça × 8-18 peças = 1.200 a 2.700
-- flocos por porção, sem uma fresta de queijo. A densidade agora é por tipo de fio,
-- e a cor do floco do frango ficou mais escura para ler como frango, não como queijo.
UPDATE ingrediente_render r
   SET params = r.params || jsonb_build_object('porcao', c.fios, 'particulaTamanho', c.tamanho)
  FROM (VALUES
    ('frango',     16, 0.22),
    ('atum',       14, 0.20),
    ('carne-seca', 14, 0.20),
    ('parmesao',   24, 0.18),
    ('provolone',  20, 0.18),
    ('oregano',    80, 0.05)
  ) AS c(slug, fios, tamanho)
 WHERE r.id_ingrediente = (SELECT id_ingrediente FROM ingrediente WHERE slug = c.slug);

UPDATE ingrediente_render r
   SET params = r.params || jsonb_build_object('particulaCor', '#a9703a')
 WHERE r.id_ingrediente = (SELECT id_ingrediente FROM ingrediente WHERE slug = 'frango');

SELECT i.slug, r.params->>'porcao' AS fios, r.params->>'particulaTamanho' AS tamanho, r.params->>'particulaCor' AS cor
  FROM ingrediente i JOIN ingrediente_render r ON r.id_ingrediente = i.id_ingrediente
 WHERE i.classe = 'desfiado' ORDER BY i.slug;
