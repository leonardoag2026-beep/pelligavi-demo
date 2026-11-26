-- catupiry estava com raio 0,09 × escala 0,8 (tubo de ~7 cm) e 66 fios por peça:
-- virava uma trança cobrindo a pizza. Fio fino e em quantidade de fio de verdade.
UPDATE ingrediente_render r
   SET params = r.params || jsonb_build_object('raio', 0.022, 'escala', 1, 'porcao', 14)
 WHERE r.id_ingrediente = (SELECT id_ingrediente FROM ingrediente WHERE slug = 'catupiry');

SELECT i.slug, r.params->>'raio' AS raio, r.params->>'escala' AS escala, r.params->>'porcao' AS fios
  FROM ingrediente i JOIN ingrediente_render r ON r.id_ingrediente = i.id_ingrediente
 WHERE i.slug = 'catupiry';
