import { Router } from 'express';
import relatorioController from '../controllers/relatorio.controller.js';
import { autenticar } from '../../../shared/middlewares/auth.middleware.js';

/**
 * @openapi
 * /api/relatorios/resumo:
 *   get:
 *     summary: Resumo do período (vendas por dia, forma de pagamento, canal e top itens)
 *     tags: [Relatórios]
 *     parameters:
 *       - in: query
 *         name: de
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: ate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Agregados calculados no banco
 */
const relatorioRoutes = Router();

relatorioRoutes.get('/resumo', autenticar, relatorioController.resumo);

export default relatorioRoutes;
