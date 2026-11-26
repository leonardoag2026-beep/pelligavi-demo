-- 11. custos: contas fixas de demonstracao (as mesmas que estavam no front)
INSERT INTO custo_conta (nome, categoria, valor, tipo, intervalo_dias, icone)
SELECT v.nome, v.categoria, v.valor, v.tipo, v.intervalo, v.icone
  FROM (VALUES
        ('Aluguel do imóvel', 'Locação comercial', 250000, 'mensal', NULL::integer, 'aluguel'),
        ('Conta de luz', 'Energia elétrica', 68000, 'mensal', NULL, 'luz'),
        ('Conta de água', 'Saneamento', 24000, 'mensal', NULL, 'agua'),
        ('Internet e telefone', 'Telecomunicações', 14990, 'mensal', NULL, 'internet')
       ) AS v(nome, categoria, valor, tipo, intervalo, icone)
 WHERE NOT EXISTS (SELECT 1 FROM custo_conta c WHERE c.nome = v.nome);

-- compras de insumo de exemplo: mussarela e calabresa, para o calculo de custo real
INSERT INTO compra_insumo (id_ingrediente, gramas, valor_total, fornecedor, comprada_em)
SELECT i.id_ingrediente, v.gramas, v.valor, v.fornecedor, CURRENT_DATE - v.dias
  FROM (VALUES
        ('mussarela', 5000, 25100, 'Atacadão Vila Madalena', 2),
        ('calabresa',  3000,  9600, 'Frigorífico Bom Corte', 3)
       ) AS v(slug, gramas, valor, fornecedor, dias)
  JOIN ingrediente i ON i.slug = v.slug
 WHERE NOT EXISTS (
   SELECT 1 FROM compra_insumo c
    WHERE c.id_ingrediente = i.id_ingrediente AND c.gramas = v.gramas AND c.valor_total = v.valor
 );
