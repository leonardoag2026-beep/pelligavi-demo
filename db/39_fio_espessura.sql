-- o fio (catupiry) é um tubo: sem `raio` na receita o CRM não tinha campo nenhum de
-- grossura e o motor caía no 0.03 fixo — mudar a escala também não fazia efeito
UPDATE ingrediente_render r
   SET params = r.params || jsonb_build_object('raio', 0.03)
 WHERE r.params->>'tipo' = 'fio'
   AND NOT (r.params ? 'raio');

SELECT i.slug, r.params->>'tipo' AS tipo, r.params->>'raio' AS raio, r.params->>'escala' AS escala
  FROM ingrediente i JOIN ingrediente_render r ON r.id_ingrediente = i.id_ingrediente
 WHERE r.params->>'tipo' = 'fio';
