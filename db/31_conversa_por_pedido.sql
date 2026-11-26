-- pedido feito pelo site abre conversa no CRM: as conversas do painel deixam de ser só semente
CREATE OR REPLACE FUNCTION pedido_abre_conversa() RETURNS trigger AS $$
DECLARE
  v_codigo text;
  v_id     integer;
BEGIN
  IF NEW.id_canal <> 1 THEN   -- 1 = Site
    RETURN NEW;
  END IF;

  -- pedidos criados por procedure podem não ter numero; cai para o id
  v_codigo := 'cv-p' || COALESCE(NEW.numero::text, NEW.id_pedido::text);

  INSERT INTO conversa (codigo, canal, nome, pedido, status, nao_lidas, etapa, aberta_em, atualizada_em)
  VALUES (v_codigo, 'site', NEW.nome_cliente,
          'PLG-' || COALESCE(NEW.numero::text, NEW.id_pedido::text),
          'aberta', 1, 'pedido', NEW.data_hora, NEW.data_hora)
  ON CONFLICT (codigo) DO NOTHING
  RETURNING id_conversa INTO v_id;

  IF v_id IS NULL THEN
    SELECT id_conversa INTO v_id FROM conversa WHERE codigo = v_codigo;
  END IF;

  INSERT INTO mensagem (id_conversa, de, texto, tipo, enviada_em)
  VALUES (v_id, 'cliente',
          'Fiz o pedido PLG-' || COALESCE(NEW.numero::text, NEW.id_pedido::text) || ' pelo site.',
          'texto', NEW.data_hora);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pedido_conversa ON pedido;
CREATE TRIGGER trg_pedido_conversa AFTER INSERT ON pedido
FOR EACH ROW EXECUTE FUNCTION pedido_abre_conversa();
