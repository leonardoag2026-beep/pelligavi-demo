-- login sem senha: código de 6 dígitos por e-mail ou SMS (envio simulado no server)
CREATE TABLE IF NOT EXISTS codigo_acesso (
  id_codigo   serial PRIMARY KEY,
  destino     text NOT NULL,
  canal       text NOT NULL CHECK (canal IN ('email', 'sms')),
  codigo      text NOT NULL,
  proposito   text NOT NULL CHECK (proposito IN ('login', 'contato')),
  tentativas  int NOT NULL DEFAULT 0,
  usado_em    timestamptz,
  expira_em   timestamptz NOT NULL,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_codigo_destino
  ON codigo_acesso (destino, proposito, criado_em DESC);

CREATE INDEX IF NOT EXISTS ix_codigo_ativo
  ON codigo_acesso (destino, proposito) WHERE usado_em IS NULL;

-- a senha deixa de ser obrigatória: quem entra é o código
ALTER TABLE cliente ALTER COLUMN senha_hash DROP NOT NULL;
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS email_verificado boolean NOT NULL DEFAULT false;
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS telefone_verificado boolean NOT NULL DEFAULT false;
