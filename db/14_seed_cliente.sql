-- 14. clientes de demonstracao (os mesmos que estavam no front) e seus enderecos
INSERT INTO cliente (nome, telefone, data_cadastro)
SELECT v.nome, v.telefone, NOW() - (v.dias || ' days')::interval
  FROM (VALUES
        ('Bruno Tavares',  '(11) 99120-4477', 12),
        ('Diego Salles',   '(11) 98311-2090',  9),
        ('Camila Prado',   '(11) 97744-1120',  7),
        ('Rafael Nunes',   '(11) 96603-8811',  5),
        ('Priscila Mota',  '(11) 95522-7741',  3),
        ('Helena Rosa',    '(11) 91234-5566',  1)
       ) AS v(nome, telefone, dias)
 WHERE NOT EXISTS (SELECT 1 FROM cliente c WHERE c.telefone = v.telefone);

INSERT INTO cliente_endereco_texto (id_cliente, ordem, descricao)
SELECT c.id_cliente, 0, v.endereco
  FROM (VALUES
        ('(11) 99120-4477', 'Rua Girassol, 118 — Vila Madalena'),
        ('(11) 98311-2090', 'Rua Fradique Coutinho, 902 — Pinheiros'),
        ('(11) 97744-1120', 'Rua Aspicuelta, 44 — Vila Madalena'),
        ('(11) 96603-8811', 'Rua Harmonia, 233 — Vila Madalena'),
        ('(11) 95522-7741', 'Rua Purpurina, 71 — Vila Madalena'),
        ('(11) 91234-5566', 'Rua Medeiros de Albuquerque, 300 — Vila Madalena')
       ) AS v(telefone, endereco)
  JOIN cliente c ON c.telefone = v.telefone
 WHERE NOT EXISTS (
   SELECT 1 FROM cliente_endereco_texto e WHERE e.id_cliente = c.id_cliente AND e.ordem = 0
 );
