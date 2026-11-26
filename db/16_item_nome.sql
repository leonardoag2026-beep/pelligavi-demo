-- 16. item_pedido: preenche o nome dos itens antigos a partir do produto associado
UPDATE item_pedido i
   SET nome = COALESCE(
         (SELECT pr.nome
            FROM item_pedido_produto ip
            JOIN produto pr ON pr.id_produto = ip.id_produto
           WHERE ip.id_item_pedido = i.id_item_pedido
           LIMIT 1),
         'Item do pedido')
 WHERE i.nome IS NULL;
