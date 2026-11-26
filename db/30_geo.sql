-- coordenada da loja + cache de geocodificação: a validação de raio de entrega tem de
-- acontecer no servidor, então ele precisa da coordenada da loja e do endereço do cliente
ALTER TABLE loja_config ADD COLUMN IF NOT EXISTS latitude  numeric(9,6);
ALTER TABLE loja_config ADD COLUMN IF NOT EXISTS longitude numeric(9,6);

UPDATE loja_config SET latitude = -23.555305, longitude = -46.687959 WHERE id_config = 1;

CREATE TABLE IF NOT EXISTS geo_cache (
  consulta   text PRIMARY KEY,
  latitude   numeric(9,6) NOT NULL,
  longitude  numeric(9,6) NOT NULL,
  criado_em  timestamptz NOT NULL DEFAULT now()
);
