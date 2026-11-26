ALTER TABLE cliente ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS senha_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cliente_email ON cliente (lower(email)) WHERE email IS NOT NULL;
