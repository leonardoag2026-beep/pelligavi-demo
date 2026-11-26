-- =====================================================================
-- Pelligavi - 02_seed.sql
-- Dados de exemplo: dominios, cardapio, clientes, pedidos e caixa.
-- Rodar depois de 01_schema.sql
-- Observacao de modelagem: tamanho 'Unico' existe para bebidas e
-- adicionais, que nao variam por tamanho de pizza (preco_produto exige
-- id_tamanho em toda linha).
-- =====================================================================

BEGIN;

-- 01. categorias
INSERT INTO categoria (nome) VALUES
  ('Pizza'), ('Bebida'), ('Adicional');

-- 02. tamanhos
INSERT INTO tamanho (nome, ordem) VALUES
  ('Unico', 0), ('Pequena', 1), ('Media', 2), ('Grande', 3);

-- 03. status
INSERT INTO status_pedido (nome, ordem, encerra_pedido) VALUES
  ('Recebido', 1, FALSE),
  ('Em preparo', 2, FALSE),
  ('Pronto', 3, FALSE),
  ('Saiu para entrega', 4, FALSE),
  ('Entregue', 5, TRUE),
  ('Retirado', 6, TRUE),
  ('Cancelado', 7, TRUE);

-- 04. canais
INSERT INTO canal_origem (nome) VALUES
  ('Site'), ('WhatsApp'), ('iFood'), ('99Food'), ('Telefone'), ('Balcao');

-- 05. tipos de pedido
INSERT INTO tipo_pedido (nome, exige_endereco, taxa_base) VALUES
  ('Entrega', TRUE, 8.00),
  ('Retirada', FALSE, 0.00),
  ('Balcao', FALSE, 0.00);

-- 06. formas de pagamento
INSERT INTO forma_pagamento (nome, aceita_troco) VALUES
  ('Dinheiro', TRUE), ('Cartao de credito', FALSE),
  ('Cartao de debito', FALSE), ('PIX', FALSE);

-- 07. faixas de desconto
INSERT INTO regra_desconto (valor_minimo, percentual) VALUES
  (80.00, 5.00), (120.00, 10.00);

-- 08. gerente (senha em scrypt; demo: pizzaria2026 - trocar em producao)
INSERT INTO gerente (nome, login, senha_hash) VALUES
  ('Leonardo Guimaraes', 'gerente@pelligavi.com',
   'scrypt$16384$8$1$1f0d3fd9a841302ceedd3385b2b1de3a$0d8a0ad34786b66a79f7447bd2b49deda5ee0e81d82e58769de743969ccde98e');

-- 09. clientes
INSERT INTO cliente (nome, telefone) VALUES
  ('Bruno Tavares',   '(11) 99120-4477'),
  ('Diego Salles',    '(11) 98311-2090'),
  ('Camila Prado',    '(11) 97744-1120'),
  ('Priscila Mota',   '(11) 95522-7741'),
  ('Helena Rosa',     '(11) 91234-5566');

-- 13. enderecos
INSERT INTO endereco (id_cliente, logradouro, numero, complemento, bairro, cidade, cep, referencia, apelido)
SELECT id_cliente, 'Rua Girassol',             '118', 'apto 42', 'Vila Madalena', 'Sao Paulo', '05433-000', 'portaria azul', 'casa'
  FROM cliente WHERE nome = 'Bruno Tavares'
UNION ALL
SELECT id_cliente, 'Rua Fradique Coutinho',    '902', NULL,      'Pinheiros',     'Sao Paulo', '05416-010', NULL, 'trabalho'
  FROM cliente WHERE nome = 'Diego Salles'
UNION ALL
SELECT id_cliente, 'Rua Aspicuelta',           '44',  NULL,      'Vila Madalena', 'Sao Paulo', '05433-010', NULL, 'casa'
  FROM cliente WHERE nome = 'Camila Prado'
UNION ALL
SELECT id_cliente, 'Rua Purpurina',            '71',  'fundos',  'Vila Madalena', 'Sao Paulo', '05435-030', NULL, 'casa'
  FROM cliente WHERE nome = 'Priscila Mota'
UNION ALL
SELECT id_cliente, 'Rua Medeiros de Albuquerque', '300', NULL,   'Vila Madalena', 'Sao Paulo', '05436-060', NULL, 'casa'
  FROM cliente WHERE nome = 'Helena Rosa';

-- 11. produtos: sabores
INSERT INTO produto (id_categoria, nome, descricao) VALUES
  ((SELECT id_categoria FROM categoria WHERE nome = 'Pizza'), 'Margherita', 'Mussarela, tomate e manjericao'),
  ((SELECT id_categoria FROM categoria WHERE nome = 'Pizza'), 'Calabresa', 'Calabresa fatiada e cebola roxa'),
  ((SELECT id_categoria FROM categoria WHERE nome = 'Pizza'), 'Pepperoni', 'Pepperoni e mussarela'),
  ((SELECT id_categoria FROM categoria WHERE nome = 'Pizza'), 'Quatro Queijos', 'Mussarela, provolone, gorgonzola e parmesao'),
  ((SELECT id_categoria FROM categoria WHERE nome = 'Pizza'), 'Portuguesa', 'Presunto, mussarela, cebola, azeitona e milho'),
  ((SELECT id_categoria FROM categoria WHERE nome = 'Pizza'), 'Frango com Catupiry', 'Frango desfiado e catupiry'),
  ((SELECT id_categoria FROM categoria WHERE nome = 'Pizza'), 'Horta', 'Rucula, tomate, berinjela e abobrinha');

-- 11. produtos: bebidas
INSERT INTO produto (id_categoria, nome, descricao) VALUES
  ((SELECT id_categoria FROM categoria WHERE nome = 'Bebida'), 'Coca-Cola lata', '350 ml'),
  ((SELECT id_categoria FROM categoria WHERE nome = 'Bebida'), 'Coca-Cola 2 litros', 'Garrafa PET'),
  ((SELECT id_categoria FROM categoria WHERE nome = 'Bebida'), 'Guarana lata', '350 ml'),
  ((SELECT id_categoria FROM categoria WHERE nome = 'Bebida'), 'Guarana 2 litros', 'Garrafa PET'),
  ((SELECT id_categoria FROM categoria WHERE nome = 'Bebida'), 'Agua sem gas', '500 ml'),
  ((SELECT id_categoria FROM categoria WHERE nome = 'Bebida'), 'Suco de laranja', '500 ml'),
  ((SELECT id_categoria FROM categoria WHERE nome = 'Bebida'), 'Cerveja long neck', '355 ml');

-- 11. produtos: adicionais
INSERT INTO produto (id_categoria, nome, descricao) VALUES
  ((SELECT id_categoria FROM categoria WHERE nome = 'Adicional'), 'Borda de catupiry', 'Recheio dentro da borda'),
  ((SELECT id_categoria FROM categoria WHERE nome = 'Adicional'), 'Borda de cheddar', 'Recheio dentro da borda'),
  ((SELECT id_categoria FROM categoria WHERE nome = 'Adicional'), 'Borda de mussarela', 'Recheio dentro da borda'),
  ((SELECT id_categoria FROM categoria WHERE nome = 'Adicional'), 'Mussarela extra', 'Porcao adicional'),
  ((SELECT id_categoria FROM categoria WHERE nome = 'Adicional'), 'Pepperoni extra', 'Porcao adicional');

-- 12. precos por sabor e tamanho
INSERT INTO preco_produto (id_produto, id_tamanho, valor)
SELECT p.id_produto, t.id_tamanho, v.valor
FROM (VALUES
  ('Margherita',        'Pequena', 39.00), ('Margherita',        'Media', 52.70), ('Margherita',        'Grande', 69.40),
  ('Calabresa',         'Pequena', 42.00), ('Calabresa',         'Media', 56.70), ('Calabresa',         'Grande', 74.70),
  ('Pepperoni',         'Pequena', 46.00), ('Pepperoni',         'Media', 62.10), ('Pepperoni',         'Grande', 81.80),
  ('Quatro Queijos',    'Pequena', 48.00), ('Quatro Queijos',    'Media', 64.80), ('Quatro Queijos',    'Grande', 85.40),
  ('Portuguesa',        'Pequena', 45.00), ('Portuguesa',        'Media', 60.75), ('Portuguesa',        'Grande', 80.00),
  ('Frango com Catupiry','Pequena',47.00), ('Frango com Catupiry','Media', 63.45), ('Frango com Catupiry','Grande', 83.60),
  ('Horta',             'Pequena', 44.00), ('Horta',             'Media', 59.40), ('Horta',             'Grande', 78.20)
) AS v(produto, tamanho, valor)
JOIN produto p ON p.nome = v.produto
JOIN tamanho t ON t.nome = v.tamanho;

-- 12. bebidas e adicionais usam o tamanho 'Unico'
INSERT INTO preco_produto (id_produto, id_tamanho, valor)
SELECT p.id_produto, (SELECT id_tamanho FROM tamanho WHERE nome = 'Unico'), v.valor
FROM (VALUES
  ('Coca-Cola lata', 7.50), ('Coca-Cola 2 litros', 14.00), ('Guarana lata', 6.50),
  ('Guarana 2 litros', 12.00), ('Agua sem gas', 4.00), ('Suco de laranja', 9.00),
  ('Cerveja long neck', 9.50), ('Borda de catupiry', 6.00), ('Borda de cheddar', 6.00),
  ('Borda de mussarela', 5.00), ('Mussarela extra', 7.00), ('Pepperoni extra', 10.00)
) AS v(produto, valor)
JOIN produto p ON p.nome = v.produto;

-- 30. caixa aberto
INSERT INTO caixa (valor_inicial) VALUES (200.00);

-- 14. pedidos
INSERT INTO pedido (
  id_cliente, id_status, id_canal, id_tipo, nome_cliente,
  entrega_logradouro, entrega_numero, entrega_complemento, entrega_bairro, entrega_cidade, entrega_referencia,
  subtotal, taxa_entrega, desconto, total
) VALUES
  ((SELECT id_cliente FROM cliente WHERE nome = 'Bruno Tavares'),
   (SELECT id_status FROM status_pedido WHERE nome = 'Em preparo'),
   (SELECT id_canal FROM canal_origem WHERE nome = 'WhatsApp'),
   (SELECT id_tipo FROM tipo_pedido WHERE nome = 'Entrega'),
   'Bruno Tavares', 'Rua Girassol', '118', 'apto 42', 'Vila Madalena', 'Sao Paulo', 'portaria azul',
   76.90, 8.00, 0.00, 84.90),

  ((SELECT id_cliente FROM cliente WHERE nome = 'Diego Salles'),
   (SELECT id_status FROM status_pedido WHERE nome = 'Pronto'),
   (SELECT id_canal FROM canal_origem WHERE nome = 'iFood'),
   (SELECT id_tipo FROM tipo_pedido WHERE nome = 'Entrega'),
   'Diego Salles', 'Rua Fradique Coutinho', '902', NULL, 'Pinheiros', 'Sao Paulo', NULL,
   93.80, 8.00, 4.69, 97.11),

  ((SELECT id_cliente FROM cliente WHERE nome = 'Camila Prado'),
   (SELECT id_status FROM status_pedido WHERE nome = 'Entregue'),
   (SELECT id_canal FROM canal_origem WHERE nome = 'Site'),
   (SELECT id_tipo FROM tipo_pedido WHERE nome = 'Retirada'),
   'Camila Prado', NULL, NULL, NULL, NULL, NULL, NULL,
   129.60, 0.00, 12.96, 116.64);

-- 15. itens
INSERT INTO item_pedido (id_pedido, id_tamanho, quantidade, preco_unitario, observacao) VALUES
  (1, (SELECT id_tamanho FROM tamanho WHERE nome = 'Grande'), 1, 69.40, 'sem cebola'),
  (1, (SELECT id_tamanho FROM tamanho WHERE nome = 'Unico'),  1,  7.50, NULL),
  (2, (SELECT id_tamanho FROM tamanho WHERE nome = 'Grande'), 1, 81.80, 'meio a meio'),
  (2, (SELECT id_tamanho FROM tamanho WHERE nome = 'Unico'),  1, 12.00, NULL),
  (3, (SELECT id_tamanho FROM tamanho WHERE nome = 'Media'),  2, 64.80, NULL);

-- 16. sabores/adicionais de cada item (meio a meio = dois produtos no mesmo item)
INSERT INTO item_pedido_produto (id_item_pedido, id_produto) VALUES
  (1, (SELECT id_produto FROM produto WHERE nome = 'Margherita')),
  (2, (SELECT id_produto FROM produto WHERE nome = 'Coca-Cola lata')),
  (3, (SELECT id_produto FROM produto WHERE nome = 'Calabresa')),
  (3, (SELECT id_produto FROM produto WHERE nome = 'Pepperoni')),
  (3, (SELECT id_produto FROM produto WHERE nome = 'Borda de catupiry')),
  (4, (SELECT id_produto FROM produto WHERE nome = 'Guarana 2 litros')),
  (5, (SELECT id_produto FROM produto WHERE nome = 'Quatro Queijos'));

-- 17. pagamentos (pedido 2 dividido em dinheiro + PIX)
INSERT INTO pagamento (id_pedido, id_forma, valor, troco_para) VALUES
  (1, (SELECT id_forma FROM forma_pagamento WHERE nome = 'PIX'), 84.90, NULL),
  (2, (SELECT id_forma FROM forma_pagamento WHERE nome = 'Dinheiro'), 50.00, 100.00),
  (2, (SELECT id_forma FROM forma_pagamento WHERE nome = 'PIX'), 47.11, NULL),
  (3, (SELECT id_forma FROM forma_pagamento WHERE nome = 'Cartao de credito'), 116.64, NULL);

-- 18. historico de status
INSERT INTO historico_status (id_pedido, id_status, data_hora) VALUES
  (1, (SELECT id_status FROM status_pedido WHERE nome = 'Recebido'),          NOW() - INTERVAL '12 minutes'),
  (1, (SELECT id_status FROM status_pedido WHERE nome = 'Em preparo'),        NOW() - INTERVAL '11 minutes'),
  (2, (SELECT id_status FROM status_pedido WHERE nome = 'Recebido'),          NOW() - INTERVAL '30 minutes'),
  (2, (SELECT id_status FROM status_pedido WHERE nome = 'Em preparo'),        NOW() - INTERVAL '29 minutes'),
  (2, (SELECT id_status FROM status_pedido WHERE nome = 'Pronto'),            NOW() - INTERVAL '8 minutes'),
  (3, (SELECT id_status FROM status_pedido WHERE nome = 'Recebido'),          NOW() - INTERVAL '3 hours'),
  (3, (SELECT id_status FROM status_pedido WHERE nome = 'Em preparo'),        NOW() - INTERVAL '3 hours' + INTERVAL '2 minutes'),
  (3, (SELECT id_status FROM status_pedido WHERE nome = 'Pronto'),            NOW() - INTERVAL '2 hours' - INTERVAL '40 minutes'),
  (3, (SELECT id_status FROM status_pedido WHERE nome = 'Entregue'),          NOW() - INTERVAL '2 hours' - INTERVAL '10 minutes');

-- Ajusta as sequences depois de inserir ids explicitos nos itens
SELECT setval(pg_get_serial_sequence('item_pedido', 'id_item_pedido'),
              COALESCE((SELECT MAX(id_item_pedido) FROM item_pedido), 1));
SELECT setval(pg_get_serial_sequence('pedido', 'id_pedido'),
              COALESCE((SELECT MAX(id_pedido) FROM pedido), 1));

COMMIT;
