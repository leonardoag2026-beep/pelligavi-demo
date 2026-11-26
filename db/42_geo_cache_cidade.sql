-- o cache guardava só lat/lng: uma resposta errada (bairro homônimo em outra cidade)
-- ficava servida para sempre. Agora guarda cidade/UF e só vale para a mesma cidade.
ALTER TABLE geo_cache ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE geo_cache ADD COLUMN IF NOT EXISTS uf TEXT;

-- limpa o que foi gravado sem validação de cidade
TRUNCATE geo_cache;

SELECT COUNT(*) AS linhas FROM geo_cache;
