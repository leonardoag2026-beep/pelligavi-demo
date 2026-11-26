-- textos operacionais da loja: prazo, frete grátis, raio e endereço de retirada.
-- Antes esses números viviam escritos dentro dos componentes (dado inventado no front);
-- agora são dado da loja, editáveis e servidos pela API de configuração
ALTER TABLE loja_config ADD COLUMN IF NOT EXISTS prazo_entrega_min  int  NOT NULL DEFAULT 35;
ALTER TABLE loja_config ADD COLUMN IF NOT EXISTS prazo_entrega_max  int  NOT NULL DEFAULT 45;
ALTER TABLE loja_config ADD COLUMN IF NOT EXISTS prazo_retirada_min int  NOT NULL DEFAULT 20;
ALTER TABLE loja_config ADD COLUMN IF NOT EXISTS prazo_retirada_max int  NOT NULL DEFAULT 30;
ALTER TABLE loja_config ADD COLUMN IF NOT EXISTS frete_gratis_acima int  NOT NULL DEFAULT 9000;
ALTER TABLE loja_config ADD COLUMN IF NOT EXISTS raio_entrega_km   numeric(4,1) NOT NULL DEFAULT 10;
ALTER TABLE loja_config ADD COLUMN IF NOT EXISTS endereco_retirada text NOT NULL DEFAULT 'Rua Harmonia, 512 — Vila Madalena';

UPDATE loja_config
   SET prazo_entrega_min = 35, prazo_entrega_max = 45,
       prazo_retirada_min = 20, prazo_retirada_max = 30,
       frete_gratis_acima = 9000, raio_entrega_km = 10,
       endereco_retirada = 'Rua Harmonia, 512 — Vila Madalena'
 WHERE id_config = 1;
