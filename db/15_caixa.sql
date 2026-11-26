-- 15. caixa: detalhamento por forma de pagamento e observacao do fechamento
ALTER TABLE caixa ADD COLUMN IF NOT EXISTS por_forma  JSONB        NULL;
ALTER TABLE caixa ADD COLUMN IF NOT EXISTS observacao VARCHAR(255) NULL;

CREATE INDEX IF NOT EXISTS ix_caixa_aberto ON caixa (fechado_em, aberto_em DESC);
