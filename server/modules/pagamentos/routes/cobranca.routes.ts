import { Router } from 'express';
import cobrancaController from '../controllers/cobranca.controller.js';
import reembolsoController from '../controllers/reembolso.controller.js';
import { autenticar } from '../../../shared/middlewares/auth.middleware.js';

/**
 * @openapi
 * /api/pagamentos/cobrancas:
 *   get:
 *     summary: Lista cobranças
 *     tags: [Pagamentos]
 *     responses:
 *       200:
 *         description: Cobranças com status
 *   post:
 *     summary: Cria cobrança (rascunho de pedido com valor fechado)
 *     tags: [Pagamentos]
 *     responses:
 *       201:
 *         description: Cobrança criada
 */
const cobrancaRoutes = Router();

cobrancaRoutes.get('/', autenticar, cobrancaController.listar);
cobrancaRoutes.post('/', cobrancaController.criar);
cobrancaRoutes.get('/:codigo', cobrancaController.porCodigo);
cobrancaRoutes.patch('/:codigo/pagar', cobrancaController.pagar);
cobrancaRoutes.patch('/:codigo/cancelar', autenticar, cobrancaController.cancelar);

// reembolsos ficam no mesmo módulo: é dinheiro saindo pelo mesmo caixa
const pagamentoRoutes = Router();
pagamentoRoutes.use('/cobrancas', cobrancaRoutes);
pagamentoRoutes.get('/reembolsos', autenticar, reembolsoController.listar);
pagamentoRoutes.post('/reembolsos', autenticar, reembolsoController.criar);

export { cobrancaRoutes };
export default pagamentoRoutes;
