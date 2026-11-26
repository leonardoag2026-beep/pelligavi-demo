-- 17. configuracao da loja: linha unica com taxa de entrega e meta de faturamento
CREATE TABLE IF NOT EXISTS loja_config (
    id_config        INTEGER      NOT NULL DEFAULT 1,
    taxa_base        INTEGER      NOT NULL DEFAULT 890,
    meta_faturamento INTEGER      NOT NULL DEFAULT 2000000,
    nome             VARCHAR(80)  NOT NULL DEFAULT 'Pelligavi',
    atualizado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_loja_config PRIMARY KEY (id_config),
    CONSTRAINT ck_loja_config_unica CHECK (id_config = 1),
    CONSTRAINT ck_loja_config_valores CHECK (taxa_base >= 0 AND meta_faturamento >= 0)
);

INSERT INTO loja_config (id_config, taxa_base, meta_faturamento, nome)
VALUES (1, 890, 2000000, 'Pelligavi')
ON CONFLICT (id_config) DO NOTHING;
