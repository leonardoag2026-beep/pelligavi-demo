-- =====================================================================
-- Pelligavi - 03_objetos.sql  (Tópico 5.3 - Objetos do Banco de Dados)
-- SGBD: PostgreSQL 14 ou superior (validado no 17). Rode DEPOIS do 01_schema.sql e do 02_seed.sql.
-- Conteúdo: 3 functions, 8 triggers (com as suas funções de gatilho), 4 procedures e 7 views.
--
-- DEPENDÊNCIA DE DADOS (o 02_seed.sql precisa trazer estes NOMES exatos):
--   categoria        : Pizza, Bebida, Adicional
--   status_pedido    : Recebido, Em preparo, Pronto, Saiu para entrega, Entregue, Retirado, Cancelado
--                      (campo "ordem" crescente; Cancelado com ordem MAIOR que Pronto)
--   forma_pagamento  : Dinheiro (usada no fechamento do caixa) + Cartão e PIX
--   tipo_pedido      : Entrega (exige endereço, com taxa_base), Retirada, Balcão
-- =====================================================================

-- =====================================================================
-- FUNCTIONS (3)
-- =====================================================================
DROP FUNCTION IF EXISTS calcular_desconto(NUMERIC);
DROP FUNCTION IF EXISTS calcular_preco_item(INTEGER);
DROP FUNCTION IF EXISTS calcular_total_pedido(INTEGER);

-- RF09: desconto percentual pela maior faixa cujo valor_minimo <= subtotal.
CREATE OR REPLACE FUNCTION calcular_desconto(p_subtotal NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_percentual NUMERIC;
BEGIN
    SELECT percentual INTO v_percentual
      FROM regra_desconto
     WHERE valor_minimo <= p_subtotal
     ORDER BY valor_minimo DESC
     LIMIT 1;

    RETURN round(p_subtotal * COALESCE(v_percentual, 0) / 100, 2);
END $$;

-- RF06/RF07: preço unitário do item = sabor mais caro (pizza/bebida) + soma dos adicionais,
-- sempre no tamanho do item.
CREATE OR REPLACE FUNCTION calcular_preco_item(p_id_item_pedido INTEGER)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_preco NUMERIC;
BEGIN
    SELECT COALESCE(max(CASE WHEN c.nome <> 'Adicional' THEN pp.valor END), 0)
         + COALESCE(sum(CASE WHEN c.nome =  'Adicional' THEN pp.valor END), 0)
      INTO v_preco
      FROM item_pedido_produto ipp
      JOIN item_pedido   ip ON ip.id_item_pedido = ipp.id_item_pedido
      JOIN produto       pr ON pr.id_produto     = ipp.id_produto
      JOIN categoria      c ON c.id_categoria    = pr.id_categoria
      JOIN preco_produto pp ON pp.id_produto = ipp.id_produto
                           AND pp.id_tamanho = ip.id_tamanho
     WHERE ipp.id_item_pedido = p_id_item_pedido;

    RETURN COALESCE(v_preco, 0.00);
END $$;

-- RF06/RF09: total = subtotal dos itens + taxa de entrega - desconto.
-- A taxa é a da configuração da loja (loja_config), respeitando o frete grátis acima do
-- valor anunciado; retirada e balcão não cobram entrega. É a mesma conta que a API faz,
-- e o CHECK ck_pedido_total garante a coerência na gravação.
CREATE OR REPLACE FUNCTION calcular_total_pedido(p_id_pedido INTEGER)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_subtotal NUMERIC;
    v_taxa     NUMERIC := 0;
    v_exige    BOOLEAN;
    v_cfg_taxa NUMERIC;
    v_cfg_gratis NUMERIC;
BEGIN
    SELECT t.exige_endereco INTO v_exige
      FROM pedido p
      JOIN tipo_pedido t ON t.id_tipo = p.id_tipo
     WHERE p.id_pedido = p_id_pedido;

    IF NOT FOUND THEN
        RETURN NULL;   -- pedido inexistente
    END IF;

    SELECT COALESCE(sum(quantidade * preco_unitario), 0) INTO v_subtotal
      FROM item_pedido
     WHERE id_pedido = p_id_pedido;

    IF COALESCE(v_exige, FALSE) THEN
        SELECT COALESCE(taxa_base, 0) / 100.0, COALESCE(frete_gratis_acima, 0) / 100.0
          INTO v_cfg_taxa, v_cfg_gratis
          FROM loja_config WHERE id_config = 1;

        IF NOT (v_cfg_gratis > 0 AND v_subtotal >= v_cfg_gratis) THEN
            v_taxa := COALESCE(v_cfg_taxa, 0);
        END IF;
    END IF;

    RETURN v_subtotal + v_taxa - calcular_desconto(v_subtotal);
END $$;

-- =====================================================================
-- TRIGGERS (8)
-- =====================================================================
DROP TRIGGER IF EXISTS trg_pedido_ai_historico ON pedido;
DROP TRIGGER IF EXISTS trg_pedido_au_historico ON pedido;
DROP TRIGGER IF EXISTS trg_pedido_bi_endereco ON pedido;
DROP TRIGGER IF EXISTS trg_item_pedido_produto_bi_composicao ON item_pedido_produto;
DROP TRIGGER IF EXISTS trg_item_pedido_produto_bu_composicao ON item_pedido_produto;
DROP TRIGGER IF EXISTS trg_pagamento_bi_troco ON pagamento;
DROP TRIGGER IF EXISTS trg_pagamento_bu_troco ON pagamento;
DROP TRIGGER IF EXISTS trg_caixa_bi_unico ON caixa;

-- RF14: histórico de status (1/2 e 2/2) - status inicial na criação e a cada mudança.
CREATE OR REPLACE FUNCTION fn_trg_pedido_historico() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO historico_status (id_pedido, id_status)
        VALUES (NEW.id_pedido, NEW.id_status);
    ELSIF NEW.id_status IS DISTINCT FROM OLD.id_status THEN
        INSERT INTO historico_status (id_pedido, id_status)
        VALUES (NEW.id_pedido, NEW.id_status);
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_pedido_ai_historico
    AFTER INSERT ON pedido
    FOR EACH ROW EXECUTE FUNCTION fn_trg_pedido_historico();

CREATE TRIGGER trg_pedido_au_historico
    AFTER UPDATE ON pedido
    FOR EACH ROW EXECUTE FUNCTION fn_trg_pedido_historico();

-- RF08: endereço obrigatório quando o tipo exige. Só em INSERT: a anonimização (RF05)
-- zera entrega_* de pedidos de entrega já existentes e não pode ser barrada.
-- O site grava o endereço completo em entrega_logradouro e deixa número/bairro/cidade
-- nulos; quando esses campos vêm preenchidos (pedido do balcão, importação), também
-- são conferidos. Exigir os quatro sempre barraria todo pedido do site.
CREATE OR REPLACE FUNCTION fn_trg_pedido_endereco() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_exige BOOLEAN;
    v_tem_partes BOOLEAN;
BEGIN
    SELECT exige_endereco INTO v_exige FROM tipo_pedido WHERE id_tipo = NEW.id_tipo;

    IF NOT COALESCE(v_exige, FALSE) THEN
        RETURN NEW;
    END IF;

    IF NEW.entrega_logradouro IS NULL OR trim(NEW.entrega_logradouro) = '' THEN
        RAISE EXCEPTION 'Endereço de entrega obrigatório para este tipo de pedido'
            USING ERRCODE = '45000';
    END IF;

    v_tem_partes := (NEW.entrega_numero IS NOT NULL AND trim(NEW.entrega_numero) <> '')
                 OR (NEW.entrega_bairro IS NOT NULL AND trim(NEW.entrega_bairro) <> '');

    IF v_tem_partes AND (
           NEW.entrega_numero IS NULL OR trim(NEW.entrega_numero) = ''
        OR NEW.entrega_bairro IS NULL OR trim(NEW.entrega_bairro) = ''
        OR NEW.entrega_cidade IS NULL OR trim(NEW.entrega_cidade) = '') THEN
        RAISE EXCEPTION 'Endereço incompleto: número, bairro e cidade andam juntos'
            USING ERRCODE = '45000';
    END IF;

    RETURN NEW;
END $$;

CREATE TRIGGER trg_pedido_bi_endereco
    BEFORE INSERT ON pedido
    FOR EACH ROW EXECUTE FUNCTION fn_trg_pedido_endereco();

-- RF02/RF07: composição do item - quais produtos podem dividir o mesmo item.
CREATE OR REPLACE FUNCTION fn_trg_item_composicao() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_tamanho   INTEGER;
    v_categoria VARCHAR(50);
    v_ativo     BOOLEAN;
    v_disp      BOOLEAN;
    v_total     INTEGER;
    v_pizzas    INTEGER;
    v_bebidas   INTEGER;
BEGIN
    SELECT id_tamanho INTO v_tamanho
      FROM item_pedido WHERE id_item_pedido = NEW.id_item_pedido;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item de pedido inexistente' USING ERRCODE = '45000';
    END IF;

    SELECT c.nome, p.ativo, p.disponivel INTO v_categoria, v_ativo, v_disp
      FROM produto p
      JOIN categoria c ON c.id_categoria = p.id_categoria
     WHERE p.id_produto = NEW.id_produto;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto inexistente' USING ERRCODE = '45000';
    END IF;

    -- RF02/RF03: produto precisa estar ativo e disponível
    IF NOT v_ativo OR NOT v_disp THEN
        RAISE EXCEPTION 'Produto inativo ou indisponível' USING ERRCODE = '45000';
    END IF;

    -- RF02: produto no tamanho certo (precisa ter preço no tamanho do item)
    IF NOT EXISTS (SELECT 1 FROM preco_produto
                    WHERE id_produto = NEW.id_produto AND id_tamanho = v_tamanho) THEN
        RAISE EXCEPTION 'Produto não é vendido no tamanho do item' USING ERRCODE = '45000';
    END IF;

    -- demais produtos do item (no UPDATE, exceto a própria linha que está sendo alterada)
    SELECT count(*),
           COALESCE(sum(CASE WHEN c.nome = 'Pizza'  THEN 1 ELSE 0 END), 0),
           COALESCE(sum(CASE WHEN c.nome = 'Bebida' THEN 1 ELSE 0 END), 0)
      INTO v_total, v_pizzas, v_bebidas
      FROM item_pedido_produto x
      JOIN produto p   ON p.id_produto = x.id_produto
      JOIN categoria c ON c.id_categoria = p.id_categoria
     WHERE x.id_item_pedido = NEW.id_item_pedido
       AND NOT (TG_OP = 'UPDATE'
                AND x.id_item_pedido = OLD.id_item_pedido
                AND x.id_produto = OLD.id_produto);

    -- bebida sem mistura
    IF v_categoria = 'Bebida' AND v_total > 0 THEN
        RAISE EXCEPTION 'Bebida não pode ser misturada com outros produtos no item' USING ERRCODE = '45000';
    END IF;
    IF v_categoria <> 'Bebida' AND v_bebidas > 0 THEN
        RAISE EXCEPTION 'Bebida não pode ser misturada com outros produtos no item' USING ERRCODE = '45000';
    END IF;

    -- RF07: até 5 sabores por pizza
    IF v_categoria = 'Pizza' AND v_pizzas >= 5 THEN
        RAISE EXCEPTION 'Máximo de 5 sabores por pizza' USING ERRCODE = '45000';
    END IF;

    -- adicional só com pizza
    IF v_categoria = 'Adicional' AND v_pizzas = 0 THEN
        RAISE EXCEPTION 'Adicional só pode ser vendido junto com pizza' USING ERRCODE = '45000';
    END IF;

    RETURN NEW;
END $$;

CREATE TRIGGER trg_item_pedido_produto_bi_composicao
    BEFORE INSERT ON item_pedido_produto
    FOR EACH ROW EXECUTE FUNCTION fn_trg_item_composicao();

CREATE TRIGGER trg_item_pedido_produto_bu_composicao
    BEFORE UPDATE ON item_pedido_produto
    FOR EACH ROW EXECUTE FUNCTION fn_trg_item_composicao();

-- RF10: troco_para só em forma de pagamento que aceita troco.
CREATE OR REPLACE FUNCTION fn_trg_pagamento_troco() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_aceita BOOLEAN;
BEGIN
    IF NEW.troco_para IS NOT NULL THEN
        SELECT aceita_troco INTO v_aceita
          FROM forma_pagamento WHERE id_forma = NEW.id_forma;
        IF NOT COALESCE(v_aceita, FALSE) THEN
            RAISE EXCEPTION 'Troco só é permitido em forma de pagamento que aceita troco'
                USING ERRCODE = '45000';
        END IF;
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_pagamento_bi_troco
    BEFORE INSERT ON pagamento
    FOR EACH ROW EXECUTE FUNCTION fn_trg_pagamento_troco();

CREATE TRIGGER trg_pagamento_bu_troco
    BEFORE UPDATE ON pagamento
    FOR EACH ROW EXECUTE FUNCTION fn_trg_pagamento_troco();

-- RF17: um caixa aberto por vez.
CREATE OR REPLACE FUNCTION fn_trg_caixa_unico() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.fechado_em IS NULL
       AND EXISTS (SELECT 1 FROM caixa WHERE fechado_em IS NULL) THEN
        RAISE EXCEPTION 'Já existe um caixa aberto; feche-o antes de abrir outro'
            USING ERRCODE = '45000';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_caixa_bi_unico
    BEFORE INSERT ON caixa
    FOR EACH ROW EXECUTE FUNCTION fn_trg_caixa_unico();

-- =====================================================================
-- STORED PROCEDURES (4)
-- =====================================================================
DROP PROCEDURE IF EXISTS registrar_pedido(INTEGER, VARCHAR, INTEGER, INTEGER, INTEGER, JSONB, INTEGER);
DROP PROCEDURE IF EXISTS cancelar_pedido(INTEGER, VARCHAR);
DROP PROCEDURE IF EXISTS anonimizar_cliente(INTEGER);
DROP PROCEDURE IF EXISTS fechar_caixa(INTEGER, NUMERIC);

-- RF06/RF07/RF08/RF09: registra o pedido completo numa única transação.
--   p_id_cliente   : cliente cadastrado, ou NULL (balcão/retirada com só o nome)
--   p_nome_cliente : obrigatório quando p_id_cliente é NULL
--   p_id_endereco  : um dos endereços do cliente (copiado para o pedido), ou NULL
--   p_itens        : JSON, ex.:
--     [{"id_tamanho":2,"quantidade":1,"produtos":[1,2,8],"observacao":"sem cebola"},
--      {"id_tamanho":3,"quantidade":2,"produtos":[7]}]
--     "produtos" = sabores/bebida e adicionais; os adicionais entram por último.
-- Grava subtotal, taxa_entrega, desconto e total no MESMO UPDATE (exigência do ck_pedido_total).
CREATE OR REPLACE PROCEDURE registrar_pedido(
    IN  p_id_cliente   INTEGER,
    IN  p_nome_cliente VARCHAR,
    IN  p_id_canal     INTEGER,
    IN  p_id_tipo      INTEGER,
    IN  p_id_endereco  INTEGER,
    IN  p_itens        JSONB,
    OUT p_id_pedido    INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_id_status INTEGER;
    v_nome      VARCHAR(100);
    v_logr      VARCHAR(150);
    v_num       VARCHAR(10);
    v_compl     VARCHAR(60);
    v_bairro    VARCHAR(80);
    v_cidade    VARCHAR(80);
    v_ref       VARCHAR(150);
    v_subtotal  NUMERIC(10,2);
    v_taxa      NUMERIC(10,2);
    v_desconto  NUMERIC(10,2);
    v_total     NUMERIC(10,2);
    v_preco     NUMERIC(10,2);
    v_item      INTEGER;
    v_tamanho   INTEGER;
    v_qtd       INTEGER;
    v_obs       VARCHAR(255);
    v_prod      INTEGER;
    v_passo     INTEGER;
    v_item_json JSONB;
    v_produtos  JSONB;
BEGIN
    IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' OR jsonb_array_length(p_itens) = 0 THEN
        RAISE EXCEPTION 'Pedido sem itens: p_itens deve ser um array JSON não vazio'
            USING ERRCODE = '45000';
    END IF;

    IF p_id_cliente IS NOT NULL THEN
        SELECT nome INTO v_nome FROM cliente
         WHERE id_cliente = p_id_cliente AND anonimizado = FALSE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Cliente inexistente ou anonimizado' USING ERRCODE = '45000';
        END IF;
    ELSE
        v_nome := nullif(trim(p_nome_cliente), '');
        IF v_nome IS NULL THEN
            RAISE EXCEPTION 'Informe o cliente cadastrado ou o nome do cliente' USING ERRCODE = '45000';
        END IF;
    END IF;

    IF p_id_endereco IS NOT NULL THEN
        SELECT logradouro, numero, complemento, bairro, cidade, referencia
          INTO v_logr, v_num, v_compl, v_bairro, v_cidade, v_ref
          FROM endereco
         WHERE id_endereco = p_id_endereco
           AND id_cliente IS NOT DISTINCT FROM p_id_cliente;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Endereço inexistente ou não pertence ao cliente' USING ERRCODE = '45000';
        END IF;
    END IF;

    SELECT id_status INTO v_id_status FROM status_pedido WHERE nome = 'Recebido';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Status Recebido não cadastrado (rode o 02_seed.sql)' USING ERRCODE = '45000';
    END IF;

    -- totais provisórios coerentes com o CHECK (0 = 0 + 0 - 0); os reais entram no UPDATE final
    INSERT INTO pedido (id_cliente, id_status, id_canal, id_tipo, nome_cliente,
                        entrega_logradouro, entrega_numero, entrega_complemento,
                        entrega_bairro, entrega_cidade, entrega_referencia,
                        subtotal, taxa_entrega, desconto, total)
    VALUES (p_id_cliente, v_id_status, p_id_canal, p_id_tipo, v_nome,
            v_logr, v_num, v_compl, v_bairro, v_cidade, v_ref,
            0.00, 0.00, 0.00, 0.00)
    RETURNING id_pedido INTO p_id_pedido;

    -- o número que aparece para o cliente é o próprio id do pedido
    UPDATE pedido SET numero = p_id_pedido WHERE id_pedido = p_id_pedido;

    FOR v_item_json IN SELECT valor FROM jsonb_array_elements(p_itens) AS valor LOOP
        v_tamanho := (v_item_json ->> 'id_tamanho')::INTEGER;
        v_qtd     := (v_item_json ->> 'quantidade')::INTEGER;
        v_obs     := nullif(v_item_json ->> 'observacao', 'null');
        v_produtos := COALESCE(v_item_json -> 'produtos', '[]'::jsonb);

        IF v_tamanho IS NULL OR v_qtd IS NULL OR jsonb_array_length(v_produtos) = 0 THEN
            RAISE EXCEPTION 'Cada item precisa de id_tamanho, quantidade e ao menos um produto'
                USING ERRCODE = '45000';
        END IF;

        INSERT INTO item_pedido (id_pedido, id_tamanho, quantidade, preco_unitario, observacao)
        VALUES (p_id_pedido, v_tamanho, v_qtd, 0.00, v_obs)
        RETURNING id_item_pedido INTO v_item;

        -- passo 0: sabores/bebida; passo 1: adicionais (o gatilho exige a pizza antes do adicional)
        FOR v_passo IN 0..1 LOOP
            FOR v_prod IN SELECT (valor)::INTEGER FROM jsonb_array_elements_text(v_produtos) AS valor LOOP
                IF COALESCE((SELECT c.nome = 'Adicional'
                               FROM produto p
                               JOIN categoria c ON c.id_categoria = p.id_categoria
                              WHERE p.id_produto = v_prod), FALSE) = (v_passo = 1) THEN
                    INSERT INTO item_pedido_produto (id_item_pedido, id_produto)
                    VALUES (v_item, v_prod);
                END IF;
            END LOOP;
        END LOOP;

        v_preco := calcular_preco_item(v_item);
        UPDATE item_pedido SET preco_unitario = v_preco WHERE id_item_pedido = v_item;
    END LOOP;

    SELECT COALESCE(sum(quantidade * preco_unitario), 0) INTO v_subtotal
      FROM item_pedido WHERE id_pedido = p_id_pedido;
    SELECT taxa_base INTO v_taxa FROM tipo_pedido WHERE id_tipo = p_id_tipo;
    v_desconto := calcular_desconto(v_subtotal);
    v_total    := calcular_total_pedido(p_id_pedido);

    UPDATE pedido
       SET subtotal = v_subtotal, taxa_entrega = v_taxa, desconto = v_desconto, total = v_total
     WHERE id_pedido = p_id_pedido;
END $$;

-- RF11: cancela até o status "Pronto", com motivo obrigatório. O histórico é gravado pelo gatilho.
CREATE OR REPLACE PROCEDURE cancelar_pedido(IN p_id_pedido INTEGER, IN p_motivo VARCHAR)
LANGUAGE plpgsql AS $$
DECLARE
    v_ordem_atual  INTEGER;
    v_ordem_pronto INTEGER;
    v_id_cancelado INTEGER;
BEGIN
    IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
        RAISE EXCEPTION 'Motivo do cancelamento é obrigatório' USING ERRCODE = '45000';
    END IF;

    SELECT s.ordem INTO v_ordem_atual
      FROM pedido p
      JOIN status_pedido s ON s.id_status = p.id_status
     WHERE p.id_pedido = p_id_pedido;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pedido inexistente' USING ERRCODE = '45000';
    END IF;

    SELECT ordem     INTO v_ordem_pronto FROM status_pedido WHERE nome = 'Pronto';
    SELECT id_status INTO v_id_cancelado FROM status_pedido WHERE nome = 'Cancelado';
    IF v_ordem_pronto IS NULL OR v_id_cancelado IS NULL THEN
        RAISE EXCEPTION 'Status Pronto/Cancelado não cadastrados (rode o 02_seed.sql)'
            USING ERRCODE = '45000';
    END IF;

    IF v_ordem_atual > v_ordem_pronto THEN
        RAISE EXCEPTION 'Pedido não pode mais ser cancelado (já saiu, foi concluído ou já está cancelado)'
            USING ERRCODE = '45000';
    END IF;

    UPDATE pedido
       SET id_status = v_id_cancelado, motivo_cancelamento = trim(p_motivo)
     WHERE id_pedido = p_id_pedido;
END $$;

-- RF05 (LGPD): remove dados pessoais, inclusive as cópias guardadas nos pedidos, e solta o
-- vínculo id_cliente dos pedidos. Os pedidos NÃO são apagados. Repetir a chamada é inofensivo.
CREATE OR REPLACE PROCEDURE anonimizar_cliente(IN p_id_cliente INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_anonimizado BOOLEAN;
BEGIN
    SELECT anonimizado INTO v_anonimizado FROM cliente WHERE id_cliente = p_id_cliente;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cliente inexistente' USING ERRCODE = '45000';
    END IF;

    IF NOT v_anonimizado THEN
        UPDATE pedido
           SET id_cliente = NULL,
               nome_cliente = 'Cliente anonimizado',
               entrega_logradouro = NULL, entrega_numero = NULL, entrega_complemento = NULL,
               entrega_bairro = NULL, entrega_cidade = NULL, entrega_referencia = NULL
         WHERE id_cliente = p_id_cliente;

        DELETE FROM endereco WHERE id_cliente = p_id_cliente;

        UPDATE cliente
           SET nome = 'Cliente anonimizado', telefone = NULL, anonimizado = TRUE
         WHERE id_cliente = p_id_cliente;
    END IF;
END $$;

-- RF17: fecha o caixa. Esperado = valor inicial + pagamentos em DINHEIRO do período,
-- ignorando pedidos cancelados. Diferença = contado - esperado (negativa = faltou dinheiro).
-- Devolve o esperado e a diferença; o detalhe por forma de pagamento vai nos NOTICE.
CREATE OR REPLACE PROCEDURE fechar_caixa(
    IN  p_id_caixa      INTEGER,
    IN  p_valor_contado NUMERIC,
    OUT p_esperado      NUMERIC,
    OUT p_diferenca     NUMERIC)
LANGUAGE plpgsql AS $$
DECLARE
    v_inicio   TIMESTAMP;
    v_fechado  TIMESTAMP;
    v_inicial  NUMERIC(10,2);
    v_fim      TIMESTAMP;
    v_dinheiro NUMERIC(10,2);
    v_linha    RECORD;
BEGIN
    SELECT aberto_em, fechado_em, valor_inicial
      INTO v_inicio, v_fechado, v_inicial
      FROM caixa WHERE id_caixa = p_id_caixa;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Caixa inexistente' USING ERRCODE = '45000';
    END IF;
    IF v_fechado IS NOT NULL THEN
        RAISE EXCEPTION 'Caixa já está fechado' USING ERRCODE = '45000';
    END IF;
    IF p_valor_contado IS NULL OR p_valor_contado < 0 THEN
        RAISE EXCEPTION 'Valor contado inválido' USING ERRCODE = '45000';
    END IF;

    v_fim := now()::TIMESTAMP;
    SELECT COALESCE(sum(pg.valor), 0) INTO v_dinheiro
      FROM pagamento pg
      JOIN forma_pagamento f ON f.id_forma  = pg.id_forma
      JOIN pedido pe         ON pe.id_pedido = pg.id_pedido
      JOIN status_pedido s   ON s.id_status  = pe.id_status
     WHERE f.nome = 'Dinheiro'
       AND s.nome <> 'Cancelado'
       AND pg.data_hora BETWEEN v_inicio AND v_fim;

    p_esperado := v_inicial + v_dinheiro;

    UPDATE caixa
       SET fechado_em = v_fim, valor_esperado = p_esperado, valor_contado = p_valor_contado
     WHERE id_caixa = p_id_caixa;

    p_diferenca := p_valor_contado - p_esperado;

    -- total por forma de pagamento no período do caixa (sem pedidos cancelados)
    FOR v_linha IN
        SELECT f.nome AS forma,
               COALESCE(sum(x.valor), 0) AS total,
               count(x.valor)            AS qtd
          FROM forma_pagamento f
          LEFT JOIN (SELECT pg.id_forma, pg.valor
                       FROM pagamento pg
                       JOIN pedido pe       ON pe.id_pedido = pg.id_pedido
                       JOIN status_pedido s ON s.id_status  = pe.id_status
                      WHERE s.nome <> 'Cancelado'
                        AND pg.data_hora BETWEEN v_inicio AND v_fim) x
                 ON x.id_forma = f.id_forma
         GROUP BY f.id_forma, f.nome
         ORDER BY f.id_forma
    LOOP
        RAISE NOTICE '%: % em % pagamento(s)', v_linha.forma, v_linha.total, v_linha.qtd;
    END LOOP;
END $$;

-- =====================================================================
-- VIEWS (7)  - "vendas" ignoram pedidos cancelados; filtre por período com WHERE dia BETWEEN ...
-- =====================================================================

-- RF18: vendas por dia
CREATE OR REPLACE VIEW vw_vendas_por_dia AS
SELECT p.data_hora::DATE          AS dia,
       count(*)                   AS qtd_pedidos,
       sum(p.subtotal)            AS subtotal,
       sum(p.taxa_entrega)        AS taxa_entrega,
       sum(p.desconto)            AS desconto,
       sum(p.total)               AS total_vendido,
       round(avg(p.total), 2)     AS ticket_medio
  FROM pedido p
  JOIN status_pedido s ON s.id_status = p.id_status
 WHERE s.nome <> 'Cancelado'
 GROUP BY p.data_hora::DATE;

-- RF18: itens mais vendidos. Conta as duas formas de item que existem no banco:
-- a normalizada (item_pedido_produto, sabores e adicionais) e a que o site grava
-- (item_pedido.nome/detalhe/tipo/composicao). Cada sabor de um meio a meio conta a
-- quantidade do item, e o valor é dividido entre os sabores para não somar duas vezes.
DROP VIEW IF EXISTS vw_itens_mais_vendidos;
CREATE OR REPLACE VIEW vw_itens_mais_vendidos AS
WITH base AS (
    SELECT ip.id_item_pedido,
           ip.id_pedido,
           ip.quantidade,
           ip.preco_unitario,
           ip.nome,
           ip.tipo,
           (SELECT count(*) FROM item_pedido_produto x
             WHERE x.id_item_pedido = ip.id_item_pedido) AS n_produtos
      FROM item_pedido ip
)
SELECT pe.data_hora::DATE                          AS dia,
       COALESCE(pr.id_produto, 0)                    AS id_produto,
       COALESCE(pr.nome, b.nome, b.tipo, 'Item')      AS produto,
       COALESCE(c.nome, b.tipo, 'Item')               AS categoria,
       sum(b.quantidade)                              AS quantidade_vendida,
       sum(round(b.preco_unitario * b.quantidade / GREATEST(b.n_produtos, 1), 2)) AS valor_vendido,
       count(DISTINCT b.id_pedido)                    AS qtd_pedidos
  FROM base b
  JOIN pedido pe           ON pe.id_pedido      = b.id_pedido
  JOIN status_pedido s     ON s.id_status       = pe.id_status
  LEFT JOIN item_pedido_produto ipp ON ipp.id_item_pedido = b.id_item_pedido
  LEFT JOIN produto pr     ON pr.id_produto     = ipp.id_produto
  LEFT JOIN categoria c    ON c.id_categoria    = pr.id_categoria
 WHERE s.nome <> 'Cancelado'
   AND COALESCE(pr.nome, b.nome, b.tipo) IS NOT NULL
 GROUP BY 1, 2, 3, 4
 ORDER BY dia, quantidade_vendida DESC, produto;

-- RF18: vendas por forma de pagamento (por dia do pagamento)
CREATE OR REPLACE VIEW vw_vendas_por_forma_pagamento AS
SELECT pg.data_hora::DATE AS dia,
       f.nome             AS forma_pagamento,
       count(*)           AS qtd_pagamentos,
       sum(pg.valor)      AS total_recebido
  FROM pagamento pg
  JOIN forma_pagamento f ON f.id_forma   = pg.id_forma
  JOIN pedido pe         ON pe.id_pedido = pg.id_pedido
  JOIN status_pedido s   ON s.id_status  = pe.id_status
 WHERE s.nome <> 'Cancelado'
 GROUP BY pg.data_hora::DATE, f.id_forma, f.nome;

-- RF18: vendas por canal de origem
CREATE OR REPLACE VIEW vw_vendas_por_canal AS
SELECT pe.data_hora::DATE AS dia,
       c.nome             AS canal,
       count(*)           AS qtd_pedidos,
       sum(pe.total)      AS total_vendido
  FROM pedido pe
  JOIN canal_origem c  ON c.id_canal  = pe.id_canal
  JOIN status_pedido s ON s.id_status = pe.id_status
 WHERE s.nome <> 'Cancelado'
 GROUP BY pe.data_hora::DATE, c.id_canal, c.nome;

-- RF18: tempo médio de preparo (de "Em preparo" até "Pronto", pelo histórico), em minutos
CREATE OR REPLACE VIEW vw_tempo_medio_preparo AS
SELECT t.fim::DATE                                    AS dia,
       count(*)                                       AS qtd_pedidos,
       round(avg(extract(epoch FROM t.fim - t.ini)) / 60, 2) AS tempo_medio_minutos
  FROM (SELECT h.id_pedido,
               min(CASE WHEN s.nome = 'Em preparo' THEN h.data_hora END) AS ini,
               min(CASE WHEN s.nome = 'Pronto'     THEN h.data_hora END) AS fim
          FROM historico_status h
          JOIN status_pedido s ON s.id_status = h.id_status
         GROUP BY h.id_pedido) t
  JOIN pedido pe        ON pe.id_pedido = t.id_pedido
  JOIN status_pedido sp ON sp.id_status = pe.id_status
 WHERE t.ini IS NOT NULL AND t.fim IS NOT NULL AND sp.nome <> 'Cancelado'
 GROUP BY t.fim::DATE;

-- RF10: pedido pago = soma dos pagamentos cobre o total
CREATE OR REPLACE VIEW vw_pedido_pago AS
SELECT pe.id_pedido,
       pe.data_hora,
       pe.nome_cliente,
       s.nome                                AS status,
       pe.total,
       COALESCE(pg.total_pago, 0)            AS total_pago,
       pe.total - COALESCE(pg.total_pago, 0) AS saldo,
       (COALESCE(pg.total_pago, 0) >= pe.total) AS pago
  FROM pedido pe
  JOIN status_pedido s ON s.id_status = pe.id_status
  LEFT JOIN (SELECT id_pedido, sum(valor) AS total_pago
               FROM pagamento
              GROUP BY id_pedido) pg ON pg.id_pedido = pe.id_pedido;

-- RF12: fila da cozinha - pedidos Recebido/Em preparo por ordem de chegada, com itens,
-- meio a meio, adicionais e observações. Lê o item normalizado quando existe e, quando
-- não existe (itens gravados pelo site), usa nome/detalhe do próprio item.
DROP VIEW IF EXISTS vw_fila_cozinha;
CREATE OR REPLACE VIEW vw_fila_cozinha AS
WITH item AS (
    SELECT ip.id_item_pedido,
           ip.id_pedido,
           ip.quantidade,
           ip.observacao,
           ip.nome,
           ip.detalhe,
           t.nome AS tamanho,
           (SELECT count(*) FROM item_pedido_produto x
             WHERE x.id_item_pedido = ip.id_item_pedido) AS n_produtos,
           (SELECT string_agg(pr.nome, ' / ' ORDER BY pr.nome)
              FROM item_pedido_produto x
              JOIN produto pr   ON pr.id_produto   = x.id_produto
              JOIN categoria c  ON c.id_categoria  = pr.id_categoria
             WHERE x.id_item_pedido = ip.id_item_pedido AND c.nome <> 'Adicional') AS sabores,
           (SELECT string_agg(pr.nome, ', ' ORDER BY pr.nome)
              FROM item_pedido_produto x
              JOIN produto pr   ON pr.id_produto   = x.id_produto
              JOIN categoria c  ON c.id_categoria  = pr.id_categoria
             WHERE x.id_item_pedido = ip.id_item_pedido AND c.nome = 'Adicional') AS adicionais
      FROM item_pedido ip
      JOIN tamanho t ON t.id_tamanho = ip.id_tamanho
)
SELECT pe.id_pedido,
       pe.data_hora,
       s.nome      AS status,
       tp.nome     AS tipo,
       pe.nome_cliente,
       string_agg(
           i.quantidade || 'x ' ||
           CASE WHEN i.n_produtos > 0 THEN i.tamanho ELSE '' END ||
           CASE WHEN i.n_produtos > 0 THEN ': ' || COALESCE(i.sabores, '')
                ELSE COALESCE(i.nome, '') ||
                     CASE WHEN i.detalhe IS NOT NULL THEN ' (' || i.detalhe || ')' ELSE '' END
           END ||
           CASE WHEN i.n_produtos > 1 THEN ' (meio a meio)' ELSE '' END ||
           COALESCE(' + ' || i.adicionais, '') ||
           COALESCE(' [obs: ' || i.observacao || ']', ''),
           ' | ' ORDER BY i.id_item_pedido) AS itens
  FROM pedido pe
  JOIN status_pedido s ON s.id_status = pe.id_status
  JOIN tipo_pedido tp  ON tp.id_tipo  = pe.id_tipo
  LEFT JOIN item i     ON i.id_pedido = pe.id_pedido
 WHERE s.nome IN ('Recebido', 'Em preparo')
 GROUP BY pe.id_pedido, pe.data_hora, s.nome, tp.nome, pe.nome_cliente
 ORDER BY pe.data_hora, pe.id_pedido;
