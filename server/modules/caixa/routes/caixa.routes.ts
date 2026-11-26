import { Router } from 'express';
import caixaController from '../controllers/caixa.controller.js';
import { autenticar } from '../../../shared/middlewares/auth.middleware.js';

/**
 * @openapi
 * /api/caixa:
 *   get:
 *     summary: Estado do caixa (aberto/fechado) com movimento por forma de pagamento
 *     tags: [Caixa]
 *     responses:
 *       200:
 *         description: Estado do caixa e últimos fechamentos
 */
const caixaRoutes = Router();

caixaRoutes.get('/', autenticar, caixaController.estado);
caixaRoutes.post('/abrir', autenticar, caixaController.abrir);
caixaRoutes.post('/fechar', autenticar, caixaController.fechar);

export default caixaRoutes;
