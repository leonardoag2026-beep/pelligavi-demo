-- cor base que ainda vinha do mapa RECEITAS do front
UPDATE ingrediente_render r
   SET params = r.params || jsonb_build_object('cor', c.cor)
  FROM (VALUES ('parmesao', '#e2d09c'), ('oregano', '#3d6b2c')) AS c(slug, cor)
 WHERE r.id_ingrediente = (SELECT id_ingrediente FROM ingrediente WHERE slug = c.slug)
   AND NOT (r.params ? 'cor');
