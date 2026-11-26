-- textos institucionais da loja: a faixa de diferenciais e os passos do "como funciona".
-- Estavam escritos no componente (inclusive números como 48 h e 480 °C); agora são dado
CREATE TABLE IF NOT EXISTS loja_texto (
  chave  text PRIMARY KEY,
  grupo  text NOT NULL,
  valor  text NOT NULL,
  ordem  int  NOT NULL DEFAULT 0
);

INSERT INTO loja_texto (chave, grupo, valor, ordem) VALUES
  ('faixa.1', 'faixa',  'massa de 48 h',        1),
  ('faixa.2', 'faixa',  'forno a 480 °C',       2),
  ('faixa.3', 'faixa',  'mussarela de búfala',  3),
  ('faixa.4', 'faixa',  'tomate italiano',      4),
  ('faixa.5', 'faixa',  'farinha tipo 00',      5),
  ('passo.1', 'passo',  'Escolha o tamanho',    1),
  ('passo.2', 'passo',  'Monte a pizza',        2),
  ('passo.3', 'passo',  'Receba em casa',       3)
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, ordem = EXCLUDED.ordem, grupo = EXCLUDED.grupo;
