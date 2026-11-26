import { Router } from 'express';
import clienteController from '../controllers/cliente.controller.js';
import { autenticar } from '../../../shared/middlewares/auth.middleware.js';

/**
 * @openapi
 * /api/clientes:
 *   get:
 *     summary: Lista clientes (busca por nome ou telefone)
 *     tags: [Clientes]
 *     parameters:
 *       - in: query
 *         name: busca
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Clientes com endereços
 *   post:
 *     summary: Cria cliente
 *     tags: [Clientes]
 *     responses:
 *       201:
 *         description: Cliente criado
 */
const clienteRoutes = Router();

clienteRoutes.get('/', autenticar, clienteController.listar);
clienteRoutes.get('/total', autenticar, clienteController.total);
clienteRoutes.post('/', autenticar, clienteController.criar);
clienteRoutes.post('/checkout', clienteController.doCheckout);
clienteRoutes.get('/:id', autenticar, clienteController.porId);
clienteRoutes.put('/:id', autenticar, clienteController.atualizar);
clienteRoutes.patch('/:id/anonimizar', autenticar, clienteController.anonimizar);

export default clienteRoutes;
