-- 12. pedido: numero visivel, identidade do dispositivo e texto livre do item
-- O numero e o que o cliente ve (PLG-1042); o id_pedido continua sendo a chave tecnica.

ALTER TABLE pedido ADD COLUMN IF NOT EXISTS numero      INTEGER     NULL;
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS dispositivo VARCHAR(60) NULL;
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS conta_ref   VARCHAR(40) NULL;
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS telefone    VARCHAR(25) NULL;
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS observacao  VARCHAR(255) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pedido_numero ON pedido (numero) WHERE numero IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_pedido_dispositivo ON pedido (dispositivo);

-- item do pedido guarda o texto como o cliente viu ("Calabresa · grande · borda catupiry"),
-- porque sabor montado no site nao tem uma linha unica em produto
ALTER TABLE item_pedido ADD COLUMN IF NOT EXISTS nome    VARCHAR(120) NULL;
ALTER TABLE item_pedido ADD COLUMN IF NOT EXISTS detalhe VARCHAR(160) NULL;
ALTER TABLE item_pedido ADD COLUMN IF NOT EXISTS tipo    VARCHAR(20)  NULL;

-- pagamento: status do pagamento no gateway ou na entrega
ALTER TABLE pagamento ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pago';

-- historico: motivo opcional (cancelamento, reembolso)
ALTER TABLE historico_status ADD COLUMN IF NOT EXISTS motivo VARCHAR(255) NULL;

-- backfill: pedidos do seed antigo nao tinham numero visivel; numera por ordem de data
-- para o painel e o rastreio mostrarem PLG-#### em todos
WITH numerados AS (
    SELECT id_pedido, 1040 + ROW_NUMBER() OVER (ORDER BY data_hora, id_pedido) AS n
      FROM pedido WHERE numero IS NULL
)
UPDATE pedido p SET numero = numerados.n
  FROM numerados WHERE numerados.id_pedido = p.id_pedido;
