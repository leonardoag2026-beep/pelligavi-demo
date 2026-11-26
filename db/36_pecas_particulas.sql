-- fecha o que ainda vivia em tabela fixa no front: peças por porção e cor/tamanho do floco
-- vão para ingrediente_render.params, então o CRM passa a mandar em tudo
UPDATE ingrediente_render r
   SET params = r.params || jsonb_build_object('pecas', p.pecas)
  FROM (VALUES
    ('pepperoni', 8), ('mussarela', 7), ('provolone', 7), ('gorgonzola', 8),
    ('bacon', 30), ('presunto', 8), ('lombo', 8), ('camarao', 11),
    ('azeitona', 8), ('azeitona-verde', 8), ('cebola', 14), ('cebola-caramelo', 12),
    ('tomate', 8), ('tomate-seco', 30), ('rucula', 8), ('basilico', 8),
    ('palmito', 8), ('champignon', 18), ('pimentao', 8), ('berinjela', 8),
    ('abobrinha', 8), ('frango', 10), ('carne-seca', 8), ('atum', 8),
    ('parmesao', 8), ('catupiry', 1), ('milho', 50), ('alho', 20), ('oregano', 10)
  ) AS p(slug, pecas)
 WHERE r.id_ingrediente = (SELECT id_ingrediente FROM ingrediente WHERE slug = p.slug)
   AND NOT (r.params ? 'pecas');

UPDATE ingrediente_render r
   SET params = r.params || jsonb_build_object('particulaCor', p.cor, 'particulaTamanho', p.tamanho)
  FROM (VALUES
    ('oregano', '#3d6b2c', 0.05), ('frango', '#c79a63', 0.22), ('carne-seca', '#6b3b26', 0.20),
    ('atum', '#c39a63', 0.20), ('parmesao', '#e2d09c', 0.20), ('mussarela', '#f6e7c2', 0.22),
    ('provolone', '#f2e3bb', 0.21), ('gorgonzola', '#efe7d3', 0.19), ('presunto', '#e8a49b', 0.18),
    ('rucula', '#3f6b31', 0.10), ('basilico', '#2f5f2a', 0.09)
  ) AS p(slug, cor, tamanho)
 WHERE r.id_ingrediente = (SELECT id_ingrediente FROM ingrediente WHERE slug = p.slug)
   AND NOT (r.params ? 'particulaCor');

-- catupiry é traço contínuo, não rodela
UPDATE ingrediente SET classe = 'fio' WHERE slug = 'catupiry';
