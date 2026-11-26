-- 07. cardapio: dados (tamanhos, sabores, bordas, bebidas, ingredientes e receitas)
-- Idempotente: pode rodar de novo sem duplicar.

-- tamanhos
UPDATE tamanho SET slug = 'p', diametro_cm = 25, fatias = 6,  fator = 1.000 WHERE nome = 'Pequena';
UPDATE tamanho SET slug = 'm', diametro_cm = 35, fatias = 8,  fator = 1.350 WHERE nome = 'Media';
UPDATE tamanho SET slug = 'g', diametro_cm = 45, fatias = 12, fator = 1.780 WHERE nome = 'Grande';
UPDATE tamanho SET slug = 'u', diametro_cm = 0,  fatias = 1,  fator = 1.000 WHERE nome = 'Unico';

-- base da pizza montada no site ("Monte a sua"): preco da pequena, os outros
-- tamanhos saem pelo fator do tamanho
INSERT INTO produto (id_categoria, nome, slug, ordem, detalhe)
SELECT c.id_categoria, 'Monte a sua', 'monte-a-sua', 0, 'mussarela e o que você escolher'
  FROM categoria c WHERE c.nome = 'Pizza'
ON CONFLICT (id_categoria, nome) DO UPDATE SET slug = EXCLUDED.slug, ordem = EXCLUDED.ordem;

WITH base(valor) AS (VALUES (32.00))
INSERT INTO preco_produto (id_produto, id_tamanho, valor)
SELECT p.id_produto, t.id_tamanho, base.valor
  FROM base, produto p, tamanho t
 WHERE p.slug = 'monte-a-sua' AND t.nome = 'Pequena'
ON CONFLICT (id_produto, id_tamanho) DO UPDATE SET valor = EXCLUDED.valor;

-- sabores
UPDATE produto SET slug = 'margherita',     ordem = 1 WHERE nome = 'Margherita';
UPDATE produto SET slug = 'calabresa',      ordem = 2 WHERE nome = 'Calabresa';
UPDATE produto SET slug = 'pepperoni',      ordem = 3 WHERE nome = 'Pepperoni';
UPDATE produto SET slug = 'quatro-queijos', ordem = 4 WHERE nome = 'Quatro Queijos';
UPDATE produto SET slug = 'portuguesa',     ordem = 5 WHERE nome = 'Portuguesa';
UPDATE produto SET slug = 'frango-catupiry',ordem = 6 WHERE nome = 'Frango com Catupiry';
UPDATE produto SET slug = 'horta',          ordem = 7 WHERE nome = 'Horta';

INSERT INTO produto (id_categoria, nome, slug, ordem, detalhe)
SELECT c.id_categoria, v.nome, v.slug, v.ordem, v.detalhe
  FROM (VALUES
        ('Horta', 'horta', 7, 'rúcula, tomate, berinjela e abobrinha')
       ) AS v(nome, slug, ordem, detalhe)
  JOIN categoria c ON c.nome = 'Pizza'
ON CONFLICT (id_categoria, nome) DO UPDATE SET slug = EXCLUDED.slug, ordem = EXCLUDED.ordem, detalhe = EXCLUDED.detalhe;

-- precos dos sabores (reais). pequena = p, media = m, grande = g
WITH preco(nome, p, m, g) AS (VALUES
    ('Margherita', 36.00, 47.50, 63.00),
    ('Calabresa', 38.00, 50.50, 66.50),
    ('Pepperoni', 41.00, 54.50, 72.00),
    ('Quatro Queijos', 43.00, 57.00, 75.00),
    ('Portuguesa', 40.00, 53.00, 70.00),
    ('Frango com Catupiry', 40.00, 53.00, 70.00),
    ('Horta', 38.00, 50.50, 66.50)
)
INSERT INTO preco_produto (id_produto, id_tamanho, valor)
SELECT pr.id_produto, t.id_tamanho, x.valor
  FROM preco
  JOIN produto pr ON pr.nome = preco.nome
  JOIN categoria c ON c.id_categoria = pr.id_categoria AND c.nome = 'Pizza'
  CROSS JOIN LATERAL (VALUES ('Pequena', preco.p), ('Media', preco.m), ('Grande', preco.g)) AS x(tamanho, valor)
  JOIN tamanho t ON t.nome = x.tamanho
ON CONFLICT (id_produto, id_tamanho) DO UPDATE SET valor = EXCLUDED.valor;

-- bordas
INSERT INTO produto (id_categoria, nome, slug, ordem, detalhe)
SELECT c.id_categoria, v.nome, v.slug, v.ordem, v.detalhe
  FROM (VALUES
        ('Borda tradicional', 'borda-tradicional', 10, 'sem recheio'),
        ('Borda de catupiry', 'borda-catupiry', 11, 'recheio de catupiry'),
        ('Borda de cheddar', 'borda-cheddar', 12, 'recheio de cheddar'),
        ('Borda de mussarela', 'borda-mussarela', 13, 'recheio de mussarela')
       ) AS v(nome, slug, ordem, detalhe)
  JOIN categoria c ON c.nome = 'Adicional'
ON CONFLICT (id_categoria, nome) DO UPDATE SET slug = EXCLUDED.slug, ordem = EXCLUDED.ordem, detalhe = EXCLUDED.detalhe;

WITH preco(nome, valor) AS (VALUES
    ('Borda tradicional', 0.00), ('Borda de catupiry', 6.00),
    ('Borda de cheddar', 6.00),  ('Borda de mussarela', 5.00)
)
INSERT INTO preco_produto (id_produto, id_tamanho, valor)
SELECT pr.id_produto, t.id_tamanho, preco.valor
  FROM preco
  JOIN produto pr ON pr.nome = preco.nome
  JOIN categoria c ON c.id_categoria = pr.id_categoria AND c.nome = 'Adicional'
  JOIN tamanho t ON t.nome = 'Unico'
ON CONFLICT (id_produto, id_tamanho) DO UPDATE SET valor = EXCLUDED.valor;

-- bebidas: o seed antigo tem nomes duplicados e sem acento; o cardapio passa a ser
-- a lista unica vinda do front reprecificado. Remove as bebidas antigas (pedidos de
-- exemplo que as usavam perdem o item) e insere a lista canonica por slug.
DELETE FROM item_pedido_produto
 WHERE id_produto IN (SELECT p.id_produto FROM produto p
                        JOIN categoria c USING (id_categoria) WHERE c.nome = 'Bebida');
DELETE FROM preco_produto
 WHERE id_produto IN (SELECT p.id_produto FROM produto p
                        JOIN categoria c USING (id_categoria) WHERE c.nome = 'Bebida');
DELETE FROM produto
 WHERE id_produto IN (SELECT p.id_produto FROM produto p
                        JOIN categoria c USING (id_categoria) WHERE c.nome = 'Bebida');

INSERT INTO produto (id_categoria, nome, slug, ordem, detalhe, arte)
SELECT c.id_categoria, v.nome, v.slug, v.ordem, v.detalhe, v.arte
  FROM (VALUES
        ('Coca-Cola', 'coca-lata', 20, 'lata 350 ml', 'lata'),
        ('Coca-Cola 2 litros', 'coca-2l', 21, '2 litros', 'garrafa'),
        ('Guaraná Antarctica', 'guarana', 22, '2 litros', 'garrafa'),
        ('Fanta laranja', 'fanta', 23, 'lata 350 ml', 'lata'),
        ('Sprite', 'sprite', 24, 'lata 350 ml', 'lata'),
        ('Pepsi', 'pepsi', 25, 'lata 350 ml', 'lata'),
        ('Água sem gás', 'agua', 26, '500 ml', 'garrafa'),
        ('Água com gás', 'agua-gas', 27, '500 ml', 'garrafa'),
        ('Suco de laranja', 'suco-laranja', 28, '500 ml', 'copo'),
        ('Suco de maracujá', 'suco-maracuja', 29, '500 ml', 'copo'),
        ('Limonada suíça', 'limonada', 30, '500 ml', 'copo'),
        ('Cerveja pilsen', 'cerveja-pilsen', 31, 'long neck 355 ml', 'garrafa'),
        ('Cerveja IPA', 'cerveja-ipa', 32, '500 ml', 'garrafa'),
        ('Vinho tinto', 'vinho-taca', 33, 'taça 150 ml', 'copo'),
        ('Café espresso', 'cafe', 34, '60 ml', 'copo')
       ) AS v(nome, slug, ordem, detalhe, arte)
  JOIN categoria c ON c.nome = 'Bebida';

WITH preco(nome, valor) AS (VALUES
    ('Coca-Cola', 7.50), ('Coca-Cola 2 litros', 14.00), ('Guaraná Antarctica', 12.00),
    ('Fanta laranja', 7.50), ('Sprite', 7.50), ('Pepsi', 7.00),
    ('Água sem gás', 5.00), ('Água com gás', 6.00),
    ('Suco de laranja', 11.00), ('Suco de maracujá', 11.00), ('Limonada suíça', 12.00),
    ('Cerveja pilsen', 9.00), ('Cerveja IPA', 16.00), ('Vinho tinto', 19.00), ('Café espresso', 7.00)
)
INSERT INTO preco_produto (id_produto, id_tamanho, valor)
SELECT pr.id_produto, t.id_tamanho, preco.valor
  FROM preco
  JOIN produto pr ON pr.nome = preco.nome
  JOIN categoria c ON c.id_categoria = pr.id_categoria AND c.nome = 'Bebida'
  JOIN tamanho t ON t.nome = 'Unico'
ON CONFLICT (id_produto, id_tamanho) DO UPDATE SET valor = EXCLUDED.valor;

-- adicionais antigos que viraram ingrediente (agora vivem em ingrediente/sabor_ingrediente)
DELETE FROM item_pedido_produto
 WHERE id_produto IN (SELECT p.id_produto FROM produto p JOIN categoria c USING (id_categoria)
                       WHERE c.nome = 'Adicional' AND p.nome IN ('Mussarela extra', 'Pepperoni extra'));
DELETE FROM preco_produto
 WHERE id_produto IN (SELECT p.id_produto FROM produto p JOIN categoria c USING (id_categoria)
                       WHERE c.nome = 'Adicional' AND p.nome IN ('Mussarela extra', 'Pepperoni extra'));
DELETE FROM produto
 WHERE id_produto IN (SELECT p.id_produto FROM produto p JOIN categoria c USING (id_categoria)
                       WHERE c.nome = 'Adicional' AND p.nome IN ('Mussarela extra', 'Pepperoni extra'));

-- ingredientes: custo_kg e preco_porcao em centavos
INSERT INTO ingrediente (slug, nome, classe, custo_kg, gramas_porcao, preco_porcao, ordem) VALUES
  ('calabresa',        'Calabresa fatiada',   'rodela',   3200,  80,  700,  1),
  ('pepperoni',        'Pepperoni',           'rodela',  12190,  70, 1000,  2),
  ('frango',           'Frango desfiado',     'desfiado', 2400, 100,  950,  3),
  ('camarao',          'Camarão',             'espalhado',8495,  90, 2200,  4),
  ('catupiry',         'Catupiry',            'fio',      2800,  70,  650,  5),
  ('mussarela',        'Mussarela extra',     'desfiado', 5028,  80,  700,  6),
  ('provolone',        'Provolone',           'desfiado', 6200,  70, 1200,  7),
  ('gorgonzola',       'Gorgonzola',          'espalhado',5648,  60, 1300,  8),
  ('parmesao',         'Parmesão',            'desfiado', 7400,  40,  700,  9),
  ('bacon',            'Bacon',               'cubo',     4490,  60,  850, 10),
  ('presunto',         'Presunto',            'espalhado',3200,  70,  750, 11),
  ('lombo',            'Lombo canadense',     'espalhado',3800,  70,  900, 12),
  ('carne-seca',       'Carne seca',          'fios',     8900,  80, 1600, 13),
  ('atum',             'Atum',                'fios',     5900,  80, 1400, 14),
  ('azeitona',         'Azeitona preta',      'espalhado',2400,  40,  500, 15),
  ('azeitona-verde',   'Azeitona verde',      'espalhado',2400,  40,  500, 16),
  ('cebola',           'Cebola roxa',         'espalhado', 600,  50,  400, 17),
  ('cebola-caramelo',  'Cebola caramelizada', 'espalhado',3200,  60,  550, 18),
  ('tomate',           'Tomate',              'rodela',   1200,  60,  500, 19),
  ('tomate-seco',      'Tomate seco',         'espalhado',7900,  40,  800, 20),
  ('rucula',           'Rúcula',              'rasgada',  3000,  25,  500, 21),
  ('basilico',         'Manjericão',          'rasgada',  6000,  15,  400, 22),
  ('milho',            'Milho',               'grao',     1800,  50,  400, 23),
  ('palmito',          'Palmito',             'espalhado',4200,  60,  900, 24),
  ('champignon',       'Champignon',          'espalhado',3900,  60,  600, 25),
  ('pimentao',         'Pimentão',            'rasgada',  1400,  50,  500, 26),
  ('berinjela',        'Berinjela',           'espalhado', 800,  60,  500, 27),
  ('abobrinha',        'Abobrinha',           'espalhado', 700,  60,  500, 28),
  ('alho',             'Alho frito',          'rodela',   4500,  20,  500, 29),
  ('oregano',          'Orégano',             'espalhado',8000,   5,  200, 30)
ON CONFLICT (slug) DO UPDATE
   SET nome = EXCLUDED.nome, classe = EXCLUDED.classe, custo_kg = EXCLUDED.custo_kg,
       gramas_porcao = EXCLUDED.gramas_porcao, preco_porcao = EXCLUDED.preco_porcao,
       ordem = EXCLUDED.ordem;

-- receita dos sabores (gramas na pizza grande)
WITH receita(sabor, ingrediente, gramas) AS (VALUES
    ('Margherita', 'mussarela', 180), ('Margherita', 'tomate', 90), ('Margherita', 'basilico', 15),
    ('Calabresa', 'calabresa', 160), ('Calabresa', 'cebola', 50),
    ('Pepperoni', 'pepperoni', 140), ('Pepperoni', 'mussarela', 150),
    ('Quatro Queijos', 'mussarela', 150), ('Quatro Queijos', 'provolone', 70),
    ('Quatro Queijos', 'gorgonzola', 60), ('Quatro Queijos', 'parmesao', 40),
    ('Portuguesa', 'presunto', 110), ('Portuguesa', 'mussarela', 150), ('Portuguesa', 'cebola', 50),
    ('Portuguesa', 'azeitona', 40), ('Portuguesa', 'milho', 50),
    ('Frango com Catupiry', 'frango', 150), ('Frango com Catupiry', 'catupiry', 100),
    ('Horta', 'rucula', 40), ('Horta', 'tomate', 90), ('Horta', 'berinjela', 60), ('Horta', 'abobrinha', 60)
)
INSERT INTO sabor_ingrediente (id_produto, id_ingrediente, gramas)
SELECT pr.id_produto, i.id_ingrediente, receita.gramas
  FROM receita
  JOIN produto pr ON pr.nome = receita.sabor
  JOIN ingrediente i ON i.slug = receita.ingrediente
ON CONFLICT (id_produto, id_ingrediente) DO UPDATE SET gramas = EXCLUDED.gramas;
