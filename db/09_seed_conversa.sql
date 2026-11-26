-- 09. conversas de atendimento (dados de demonstracao)
INSERT INTO conversa (codigo, canal, nome, pedido, status, nao_lidas) VALUES
  ('cv-1', 'ifood', 'Priscila Mota', 'PLG-1036', 'aberta', 1),
  ('cv-2', '99food', 'Rafael Nunes', 'PLG-1037', 'aberta', 1),
  ('cv-3', 'whatsapp', 'Camila Prado', 'PLG-1038', 'aberta', 0),
  ('cv-4', 'site', 'Helena Rosa', 'PLG-1035', 'resolvida', 0)
ON CONFLICT (codigo) DO UPDATE
   SET canal = EXCLUDED.canal, nome = EXCLUDED.nome, pedido = EXCLUDED.pedido,
       status = EXCLUDED.status, nao_lidas = EXCLUDED.nao_lidas;

DELETE FROM mensagem
 WHERE id_conversa IN (SELECT id_conversa FROM conversa WHERE codigo IN ('cv-1', 'cv-2', 'cv-3', 'cv-4'));

INSERT INTO mensagem (id_conversa, de, texto, tipo, enviada_em) VALUES
  ((SELECT id_conversa FROM conversa WHERE codigo = 'cv-1'), 'cliente', 'Oi, chegou agora e a pizza veio fria. A borda de catupiry também não veio.', 'texto', NOW() - INTERVAL '26 minutes'),
  ((SELECT id_conversa FROM conversa WHERE codigo = 'cv-2'), 'cliente', 'Faltou troco e o entregador não tinha maquininha. Consigo pagar no pix agora?', 'texto', NOW() - INTERVAL '48 minutes'),
  ((SELECT id_conversa FROM conversa WHERE codigo = 'cv-3'), 'cliente', 'Já saiu? Pedi pra deixar na portaria.', 'texto', NOW() - INTERVAL '21 minutes'),
  ((SELECT id_conversa FROM conversa WHERE codigo = 'cv-3'), 'loja', 'Saiu agora, chega em uns 15 minutos.', 'texto', NOW() - INTERVAL '19 minutes'),
  ((SELECT id_conversa FROM conversa WHERE codigo = 'cv-4'), 'cliente', 'Queria saber se tem opção sem lactose.', 'texto', NOW() - INTERVAL '26 hours'),
  ((SELECT id_conversa FROM conversa WHERE codigo = 'cv-4'), 'loja', 'Tem "sim": massa sem leite e muçarela de búfala. É só pedir na observação.', 'texto', NOW() - INTERVAL '25 hours');

-- a conversa mais antiga sai como lida para a lista nao nascer toda vermelha
UPDATE conversa SET nao_lidas = 0 WHERE codigo = 'cv-4';
