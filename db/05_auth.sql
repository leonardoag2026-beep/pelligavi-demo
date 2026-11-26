-- =====================================================================
-- Pelligavi - 05_auth.sql
-- Autenticacao do cliente: conta + sessao (JWT com revogacao no banco)
-- Roda depois de 01_schema.sql e 02_seed.sql. Idempotente.
-- =====================================================================

DROP TABLE IF EXISTS sessao CASCADE;
DROP TABLE IF EXISTS conta CASCADE;

-- 01. conta: credencial do cliente da loja (login opcional, compra livre)
CREATE TABLE conta (
    id_conta      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    nome          VARCHAR(100)  NOT NULL,
    email         VARCHAR(160)  NULL,
    celular       VARCHAR(20)   NULL,
    senha_hash    VARCHAR(255)  NOT NULL,
    id_cliente    INTEGER       NULL,
    criado_em     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    ultimo_login  TIMESTAMPTZ   NULL,
    CONSTRAINT ck_conta_identidade CHECK (email IS NOT NULL OR celular IS NOT NULL),
    CONSTRAINT ck_conta_email CHECK (email IS NULL OR email LIKE '%_@_%._%'),
    CONSTRAINT fk_conta_cliente FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente)
        ON DELETE SET NULL ON UPDATE RESTRICT
);

CREATE UNIQUE INDEX uq_conta_email ON conta (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX uq_conta_celular ON conta (regexp_replace(celular, '\D', '', 'g')) WHERE celular IS NOT NULL;

-- 02. sessao: uma linha por login. O JWT carrega id_sessao; apagar/revogar derruba o token.
CREATE TABLE sessao (
    id_sessao    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    id_conta     UUID         NOT NULL,
    criada_em    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expira_em    TIMESTAMPTZ  NOT NULL,
    revogada_em  TIMESTAMPTZ  NULL,
    user_agent   VARCHAR(255) NULL,
    CONSTRAINT fk_sessao_conta FOREIGN KEY (id_conta) REFERENCES conta (id_conta)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_sessao_periodo CHECK (expira_em > criada_em)
);

CREATE INDEX ix_sessao_conta ON sessao (id_conta);
CREATE INDEX ix_sessao_ativa ON sessao (id_sessao) WHERE revogada_em IS NULL;

-- 03. limpeza: sessao vencida some do banco (pode rodar por cron)
CREATE OR REPLACE FUNCTION limpar_sessoes_vencidas() RETURNS INTEGER AS $$
DECLARE removidas INTEGER;
BEGIN
    DELETE FROM sessao WHERE expira_em < now() OR revogada_em IS NOT NULL;
    GET DIAGNOSTICS removidas = ROW_COUNT;
    RETURN removidas;
END;
$$ LANGUAGE plpgsql;
