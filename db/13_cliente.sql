-- 13. cliente: marca de anonimizacao (LGPD) e endereco em texto livre
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS anonimizado_em TIMESTAMP NULL;

-- o cadastro do site guarda o endereco como o cliente digitou (uma linha); ele convive
-- com a tabela endereco estruturada usada pelos pedidos de entrega
CREATE TABLE IF NOT EXISTS cliente_endereco_texto (
    id_cliente  INTEGER      NOT NULL,
    ordem       INTEGER      NOT NULL DEFAULT 0,
    descricao   VARCHAR(200) NOT NULL,
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_cliente_endereco_texto PRIMARY KEY (id_cliente, ordem),
    CONSTRAINT fk_cliente_endereco_texto_cliente FOREIGN KEY (id_cliente)
        REFERENCES cliente (id_cliente) ON DELETE CASCADE ON UPDATE RESTRICT
);

CREATE INDEX IF NOT EXISTS ix_cliente_telefone ON cliente (telefone);
