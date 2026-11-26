import { Router } from 'express';
import pedidoController from '../controllers/pedido.controller.js';
import { autenticar } from '../../../shared/middlewares/auth.middleware.js';

/**
 * @openapi
 * /api/pedidos:
 *   get:
 *     summary: Lista pedidos (filtro por dispositivo ou conta)
 *     tags: [Pedidos]
 *     responses:
 *       200:
 *         description: Pedidos com itens, pagamentos e histórico
 *   post:
 *     summary: Cria pedido com itens, pagamento e histórico
 *     tags: [Pedidos]
 *     responses:
 *       201:
 *         description: Pedido criado com o número sequencial do banco
 */
const pedidoRoutes = Router();

pedidoRoutes.get('/', autenticar, pedidoController.listar);
pedidoRoutes.post('/', pedidoController.criar);
// preço da tela: mesma conta do pedido, sem gravar
pedidoRoutes.post('/orcamento', pedidoController.orcamento);
pedidoRoutes.get('/dispositivo/:token', pedidoController.porDispositivo);
// sem auth, o numero sequencial entregava nome, telefone e endereço de qualquer pedido
pedidoRoutes.get('/:numero', autenticar, pedidoController.porNumero);
pedidoRoutes.patch('/:numero/status', autenticar, pedidoController.mudarStatus);

export default pedidoRoutes;
